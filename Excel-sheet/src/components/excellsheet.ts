import { Row } from "./row";
import { Column } from "./column";
import { Cell } from "./cell";
import { CommandManager } from "./Commands/CommandManger";
import { jsonData, headers } from "./jsonData";
import { EditCellCommand } from "./Commands/EditCommandCell";
import { MouseHandler } from "./EventHandlers/MouseHandler";
import { copySelectionToClipboardBuffer } from "./Commands/CopyCommad";
import { CutCommand } from "./Commands/CutCommand";
import { PasteCommand } from "./Commands/PastCommand";


type DataRow = {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    salary: number;
};

const rowMap = new Map<number, DataRow[]>();

jsonData.forEach((r) => {
    if (!rowMap.has(r.row)) {
        rowMap.set(r.row, []);
    }
    rowMap.get(r.row)!.push(r);
});

const colIndexToField: Record<number, keyof DataRow> = {
    0: "id",
    1: "firstName",
    2: "lastName",
    3: "age",
    4: "salary"
};


/**
 * The ExcelSheet class represents the main Excel sheet component.
 *
 * @member rows - An array of Row objects representing the rows in the Excel sheet.
 * @member columns - An array of Column objects representing the columns in the Excel sheet.
 * @member cells - A 2D array of Cell objects representing the cells in the Excel sheet.
 * @member sheetWidth - The total width of the Excel sheet in pixels.
 * @member sheetHeight - The total height of the Excel sheet in pixels.
 * @member isResizing - Indicates whether a resize operation is currently in progress.
 * @member resizeTarget - The target column or row being resized.
 * @member resizeStartPos - The screen position where the resize interaction started.
 * @member _selectedCell - Internally tracks the currently selected cell (use selectedCell getter/setter externally).
 * @member isSelectingArea - Indicates whether the user is currently selecting a cell area.
 * @member dpr - The device pixel ratio used for accurate canvas rendering.
 * @member canvas - The canvas element used to render the Excel sheet.
 * @member ctx - The 2D rendering context for the canvas.
 * @member clipboardBuffer - Stores copied or cut cell data for paste operations.
 * @member commandManager - Manages undo/redo commands for cell edits and operations.
 * @member selectedRow - The currently selected row (e.g., for full row selection).
 * @member selectedCol - The currently selected column (e.g., for full column selection).
 * @member selectedArea - Defines the currently selected cell range.
 * @member container - The outer container element holding the canvas and scrollbars.
 * @member formularBarInput - The input box linked to the formula bar.
 * @member rowHeaderWidth - Width of the row header area (usually fixed).
 * @member colHeaderHeight - Height of the column header area (usually fixed).
 * @member mouseHandler - Manages pointer interactions and delegates strategies (resize, selection, etc).
 * @member cumulativeColWidths - An array of cumulative column widths for efficient rendering.
 * @member cumulativeRowHeights - An array of cumulative row heights for efficient rendering.
 */

class ExcelSheet {

    public isResizing = false;
    public resizeTarget: { type: "column" | "row", index: number } | null = null;
    public resizeStartPos = { x: 0, y: 0 };
    private _selectedCell: { row: number; col: number } | null = null;
    public isSelectingArea = false;
    public dpr = window.devicePixelRatio || 1;
    private ctx: CanvasRenderingContext2D;
    public canvas: HTMLCanvasElement;
    public clipboardBuffer: string[][] | null = null;

    public rows: Row[] = [];
    public columns: Column[] = [];
    public cells = new Map<number, Map<number, Cell>>();
    public sheetWidth = 0;
    public sheetHeight = 0;
    public commandManager: CommandManager;
    public selectedRows: { startRow: number | null; endRow: number | null } = { startRow: null, endRow: null };
    public selectedCols: { startCol: number | null; endCol: number | null } = { startCol: null, endCol: null };
    public selectedArea: { startRow: number | null; startCol: number | null; endRow: number | null; endCol: number | null } = { startRow: null, startCol: null, endRow: null, endCol: null };
    public container: HTMLElement;
    public formularBarInput: HTMLInputElement;
    public rowHeaderWidth = 50;
    public colHeaderHeight = 30;
    public mouseHandler!: MouseHandler;
    public cumulativeColWidths: number[] = [];
    public cumulativeRowHeights: number[] = [];
    public isInputOn = false;

    /**
     * Constructor for ExcelSheet.
     * @param ctx The canvas context for rendering
     * @param canvas The canvas element for rendering
     * @param container The container element to attach listeners to.
     */
    constructor(canvas: HTMLCanvasElement, container: HTMLElement, formularBarInput: HTMLInputElement) {
        this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        this.canvas = canvas;
        this.container = container;
        this.formularBarInput = formularBarInput;
        this.generateSheet(jsonData.length + 1, 500, 30, 80, 1, "black");
        this.updateCumulativeSizes();
        this.attachEventListners();
        this.selectedCell = { row: 0, col: 0 };
        this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);

        this.mouseHandler = new MouseHandler(this);
        this.renderAreaStatus({ count: 0, sum: null, min: null, max: null, avg: null });
        this.commandManager = new CommandManager();
    }


    /**
     * Function to generate the initial Excel sheet with the specified number of rows and columns.
     * @param numberOfRows Number of rows in the sheet
     * @param numberOfColumns Number of columns in the sheet
     * @param cellHeight Starting cell height
     * @param cellWidth Starting cell width
     * @param lineWidth Line width in pixels in the sheet
     * @param lineColor Border color of the sheet
     */
    generateSheet(
        numberOfRows: number = 100000,
        numberOfColumns: number,
        cellHeight: number,
        cellWidth: number,
        lineWidth: number,
        lineColor: string
    ) {
        this.rows = Array.from({ length: numberOfRows }, (_, index) => new Row(cellHeight, index));
        this.columns = Array.from(
            { length: numberOfColumns },
            (_, index) => new Column(index, cellWidth)
        );

        const virtualArea = document.querySelector(".virtual-canvas-area") as HTMLElement;
        this.sheetWidth = this.rowHeaderWidth + (numberOfColumns * cellWidth);
        this.sheetHeight = this.colHeaderHeight + (numberOfRows * cellHeight);

        virtualArea.style.width = `${this.sheetWidth + 20}px`;
        virtualArea.style.height = `${this.sheetHeight + 20}px`;

        this.dpr = window.devicePixelRatio;

        this.canvas.width = (this.container.clientWidth) * this.dpr;
        this.canvas.height = (this.container.clientHeight) * this.dpr;

        this.canvas.style.width = (this.container.clientWidth) * this.dpr + "px";
        this.canvas.style.height = (this.container.clientHeight) * this.dpr + "px";

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);


        this.ctx.clearRect(0, 0, this.sheetWidth, this.sheetHeight);
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = lineColor;
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";

        this.cells = new Map();

        for (let row = 0; row < numberOfRows; row++) {
            const rowMap = new Map();

            for (let col = 0; col < numberOfColumns; col++) {
                let cell: Cell;

                if (row === 0) {
                    if (col < headers.length) {
                        cell = new Cell(headers[col], row, col);
                    } else {
                        continue; // Skip empty cell
                    }
                } else if (row <= jsonData.length) {
                    if (col < headers.length) {
                        const attribute = headers[col];
                        const value = jsonData[row - 1][attribute];
                        cell = new Cell(String(value), row, col);
                    } else {
                        continue; // Skip empty cell
                    }
                } else {
                    continue; // Skip empty cell
                }

                rowMap.set(col, cell);
            }

            if (rowMap.size > 0) {
                this.cells.set(row, rowMap);
            }
        }


    }

    /**
     * Updates the cumulative sizes of columns and rows.
     */
    updateCumulativeSizes() {
        this.cumulativeColWidths = this.columns.reduce<number[]>((acc, col) => {
            const last = acc[acc.length - 1] || 0;
            acc.push(last + col.width);
            return acc;
        }, []);
        this.cumulativeRowHeights = this.rows.reduce<number[]>((acc, row) => {
            const last = acc[acc.length - 1] || 0;
            acc.push(last + row.height);
            return acc;
        }, []);
    }

    /**
     * Getter for the selected cell.
     */
    get selectedCell() {
        return this._selectedCell;
    }

    /**
     * Setter for the selected cell.
     * @param cell The selected cell
     */
    set selectedCell(cell: { row: number; col: number } | null) {
        this._selectedCell = cell;

        // === Side effect: Update the address bar
        const addressDiv = document.querySelector(".address") as HTMLDivElement;

        if (addressDiv) {
            if (cell) {
                addressDiv.innerHTML = this.columns[cell.col].label + (cell.row + 1);
                this.formularBarInput.value = this.getOrCreateCell(cell.row, cell.col)?.text || "";
            } else {
                addressDiv.innerHTML = "";
                this.formularBarInput.value = "";
            }
        }

        this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);
    }

    /**
     * Get cell if not exists then create a new one
     * @param row Row index of the cell
     * @param col Col index of the cell
     * @returns Cell object
     */
    getOrCreateCell(row: number, col: number): Cell {
        let rowMap = this.cells.get(row);
        if (!rowMap) {
            rowMap = new Map();
            this.cells.set(row, rowMap);
        }
        let cell = rowMap.get(col);
        if (!cell) {
            cell = new Cell("", row, col);
            rowMap.set(col, cell);
        }
        return cell;
    }


    /**
     * To set the cell
     * @param row Row index
     * @param col Col index
     * @param cell Cell object
     */
    setCell(row: number, col: number, cell: Cell): void {
        if (!this.cells.has(row)) {
            this.cells.set(row, new Map());
        }
        this.cells.get(row)!.set(col, cell);
    }


    /**
     * To get the column index from the x position
     * @param x Cursor X position
     * @returns Column index
     */
    getColIndexFromX(x: number): number {
        let pos = 0;
        for (let i = 0; i < this.columns.length; i++) {
            pos += this.columns[i].width;
            if (x < pos) return i;
        }
        return (this.columns.length - 1);
    }

    /**
     * To get the row index from the y position
     * @param y Cursor Y position
     * @returns Row index
     */
    getRowIndexFromY(y: number): number {

        let pos = 0;

        for (let i = 0; i < this.rows.length; i++) {
            pos += this.rows[i].height;
            if (y < pos) return i;
        }
        return (this.rows.length - 1);
    }


    /**
     * To attach event listners
     */
    attachEventListners(): void {

        this.container.addEventListener("scroll", () => {
            this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);
        });

        this.container.addEventListener("dblclick", (e: MouseEvent) => {
            const rect = this.canvas.getBoundingClientRect();
            const physicalX = (e.clientX - rect.left) / this.dpr;
            const physicalY = (e.clientY - rect.top) / this.dpr;

            const x = (physicalX + this.container.scrollLeft - this.rowHeaderWidth);
            const y = (physicalY + this.container.scrollTop - this.colHeaderHeight);

            const colIndex = this.getColIndexFromX(x);
            const rowIndex = this.getRowIndexFromY(y);

            const cell = this.getOrCreateCell(rowIndex, colIndex);

            if (cell) {
                this.showInputOverCell(cell, rowIndex, colIndex);
            }
        });

        document.addEventListener("keydown", (e: KeyboardEvent) => {

            if (e.ctrlKey && e.key === "z") {
                this.commandManager.undo();
                return;
            } else if (e.ctrlKey && e.key === "y") {
                this.commandManager.redo();
                return;
            } else if (e.ctrlKey && e.key === "c") {
                copySelectionToClipboardBuffer(this);
            }

            if (e.ctrlKey && e.key === "x") {
                const cmd = new CutCommand(this);
                this.commandManager.executeCommand(cmd);
            }

            if (e.ctrlKey && e.key === "v") {
                if (this.clipboardBuffer && this.selectedCell) {
                    const { row, col } = this.selectedCell;
                    const cmd = new PasteCommand(this, row, col, this.clipboardBuffer);
                    this.commandManager.executeCommand(cmd);
                }
            }

            this.selectedCols = { startCol: null, endCol: null };
            this.selectedRows = { startRow: null, endRow: null };
            this.selectedArea = { startRow: null, startCol: null, endRow: null, endCol: null };

            if (this.isInputOn) return;

            if (!this.selectedCell) {
                this.selectedCell = { row: 0, col: 0 };
                this.selectedCols = { startCol: null, endCol: null };
                this.selectedRows = { startRow: null, endRow: null };
            };

            const { row, col } = this.selectedCell;
            let newRow = row;
            let newCol = col;

            switch (e.key) {
                case "ArrowRight":
                    newCol = Math.min(col + 1, this.columns.length - 1);
                    break;
                case "ArrowLeft":
                    newCol = Math.max(col - 1, 0);
                    break;
                case "ArrowDown":
                    newRow = Math.min(row + 1, this.rows.length - 1);
                    break;
                case "ArrowUp":
                    newRow = Math.max(row - 1, 0);
                    break;
                case "Tab":
                    e.preventDefault();
                    newCol = col + 1;
                    if (newCol >= this.columns.length) {
                        newCol = 0;
                        newRow++;
                    }
                    if (newRow >= this.rows.length) newRow = this.rows.length - 1;
                    break;

            }

            this.selectedCell = { row: newRow, col: newCol };

            // To change view to Currently selected cell
            this.scrollIntoView(newRow, newCol);

            this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);

            // === Handle input trigger on key press (A-Z, 0-9, etc.)
            const isPrintableKey =
                e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

            if (isPrintableKey) {
                const { row, col } = this.selectedCell;
                // Show input with initial value as the key pressed
                this.showInputOverCell(this.getOrCreateCell(row, col), row, col, e.key);
            }
        });

        window.addEventListener("resize", () => {
            const currentthis = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;
            if (currentthis !== this.dpr) {
                this.dpr = currentthis;
            }

            this.canvas.width = this.container.clientWidth * currentthis;
            this.canvas.height = this.container.clientHeight * currentthis;
            this.canvas.style.width = this.canvas.width + "px";
            this.canvas.style.height = this.canvas.height + "px";
            this.ctx.scale(currentthis, currentthis);

            this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);

        })

        this.formularBarInput.addEventListener("input", () => {


            if (this.selectedCell) {

                const row = this.selectedCell.row;
                const col = this.selectedCell.col;
                const newValue = this.formularBarInput.value;
                const currentValue = this.getOrCreateCell(row, col)?.text;

                if (newValue === currentValue) return;

                const cmd = new EditCellCommand(
                    row,
                    col,
                    newValue,
                    (r, c) => this.getOrCreateCell(r, c),
                    () => this.redrawVisible(this.container.scrollTop, this.container.scrollLeft)
                );

                this.commandManager.executeCommand(cmd);
            }
        })
    }


    // /**
    //  * To get the cell from the grid
    //  * @param row Row index of the cell
    //  * @param col Column index of the cell
    //  * @returns Cell object
    //  */
    // public getOrCreateCell(row: number, col: number): Cell | null {
    //     if (this.cells[row] && this.cells[row][col]) {
    //         return this.cells[row][col];
    //     }
    //     return null;
    // }


    /**
     * To show input over the cell
     * @param cell Cell object on which input is to be shown
     * @param row Row index of the cell
     * @param col Column index of the cell
     */
    public showInputOverCell(cell: Cell, row: number, col: number, initialValue?: string) {
        const x = this.cumulativeColWidths[col - 1] ?? 0;
        const y = this.cumulativeRowHeights[row - 1] ?? 0;

        this.selectedCell = { row, col };

        const input = document.createElement("input");
        const virtualArea = document.querySelector(".virtual-canvas-area") as HTMLElement;
        this.isInputOn = true;

        input.type = "text";
        input.value = initialValue ?? cell.text.toString();
        input.style.position = "absolute";
        input.style.left = `${(x + this.rowHeaderWidth) * this.dpr}px`;
        input.style.top = `${(y + this.colHeaderHeight) * this.dpr}px`;
        input.style.width = `${this.columns[col].width * this.dpr}px`;
        input.style.height = `${this.rows[row].height * this.dpr}px`;
        input.style.fontSize = "14px";
        input.style.zIndex = "1";
        virtualArea.style.overflow = "hidden";
        virtualArea.appendChild(input);
        input.focus();

        input.addEventListener("input", () => {

            this.formularBarInput.value = input.value;
        });

        input.addEventListener("blur", () => {
            let newValue = input.value;
            const cmd = new EditCellCommand(
                row,
                col,
                newValue,
                (r, c) => this.getOrCreateCell(r, c),
                () => this.redrawVisible(this.container.scrollTop, this.container.scrollLeft)
            );
            this.commandManager.executeCommand(cmd);
            virtualArea.removeChild(input);
            this.isInputOn = false;
        });

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === "Escape" || e.key === "Tab") {
                input.blur();
                if (e.key === "Enter") {
                    this.selectedCell = { row: row + 1, col };
                }
            }
        });
    }


    /**
     * To redraw the visible part of the grid
     * @param scrollTop Current scroll top of the grid
     * @param scrollLeft Current scroll left of the grid
     */
    public redrawVisible(scrollTop: number, scrollLeft: number): void {



        const viewportWidth = this.canvas.width;
        const viewportHeight = this.canvas.height;

        const startRow = this.getRowIndexFromY(scrollTop);
        const endRow = this.getRowIndexFromY(scrollTop + viewportHeight);

        const startCol = this.getColIndexFromX(scrollLeft);
        const endCol = this.getColIndexFromX(scrollLeft + viewportWidth);

        const rowIndexStr = (endRow + 1).toString();
        this.ctx.font = "14px Arial";
        const textWidth = this.ctx.measureText(rowIndexStr).width;
        const padding = 20;
        this.rowHeaderWidth = Math.floor(textWidth + padding);

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = "black";
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // === Clip to scrollable canvas area
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(this.rowHeaderWidth, this.colHeaderHeight, this.canvas.width - this.rowHeaderWidth, this.canvas.height - this.colHeaderHeight);
        this.ctx.clip();

        this.drawCellContent(startRow, endRow, startCol, endCol, scrollTop, scrollLeft);
        this.drawGridLines(startRow, endRow, startCol, endCol, scrollTop, scrollLeft);

        // === Draw grid lines (after text)
        this.ctx.beginPath();
        this.ctx.restore();
        this.highlightSelectedArea(startRow, endRow, startCol, endCol, scrollTop, scrollLeft);
        this.drawColumnHeaders(startCol, endCol, scrollLeft);
        this.drawRowHeaders(startRow, endRow, scrollTop);
        this.drawCornorBox();
    }


    /**
     * To update the text of a cell
     * @param row Row index of the cell
     * @param col Column index of the cell
     * @param newText New text of the cell
     */
    updateCell(row: number, col: number, newText: string): void {
        const rowData = rowMap.get(row) as any;
        const field = colIndexToField[col] as any;

        if (rowData && field) {
            // Attempt type coercion based on field type
            if (field === "age" || field === "salary" || field === "id") {
                rowData[field] = Number(newText);
            } else {
                rowData[field] = newText;
            }

            // Also update canvas cell
            this.getOrCreateCell(row, col)?.updateText(newText);
        }
    }


    /**
     * To render the text of a cell 
     * @param value Text to be rendered
     * @param x Position of the text on the canvas
     * @param y Position of the text on the canvas
     * @param width Width of the cell
     * @param height Height of the cell
     */
    renderText(value: string, x: number, y: number, width: number, height: number) {
        this.ctx.font = "14px Arial";
        const padding = 6;

        let text = value;
        let metrics = this.ctx.measureText(text);

        while (metrics.width > width - 2 * padding && text.length > 0) {
            text = text.slice(0, -1);
            metrics = this.ctx.measureText(text + "…");
        }

        if (text.length < value.length) {
            text += "…"; // add ellipsis
        }

        if (!isNaN(Number(text))) {
            this.ctx.fillText(text, x + (width / 2) - (metrics.width / 2) - padding, y + (height / 2) - 7);
        } else {
            this.ctx.fillText(text, x + padding - (width / 2) + (metrics.width / 2), y + (height / 2) - 7);
        }
    }

    /**
     * To draw the content of a cell
     * @param startRow Start row index of the visiable canvas
     * @param endRow end row index of the visiable canvas
     * @param startCol Start column index of the visiable canvas
     * @param endCol End column index of the visiable canvas
     * @param scrollTop Current scroll top of the grid
     * @param scrollLeft Current scroll left of the grid
     */
    drawCellContent(startRow: number, endRow: number, startCol: number, endCol: number, scrollTop: number, scrollLeft: number) {
        // === Draw cell text only
        let y = (this.cumulativeRowHeights[startRow - 1] ?? 0) - scrollTop;

        for (let row = startRow; row <= endRow; row++) {
            const rowHeight = this.rows[row].height;
            let x = (this.cumulativeColWidths[startCol - 1] ?? 0) - scrollLeft;

            for (let col = startCol; col <= endCol; col++) {
                const colWidth = this.columns[col].width;
                const cell = this.getOrCreateCell(row, col);
                if (!cell) continue;

                const cellX = x + this.rowHeaderWidth;
                const cellY = y + this.colHeaderHeight;

                this.ctx.fillStyle = "black";

                // Draw cell text
                this.renderText(
                    cell.text,
                    cellX + colWidth / 2,
                    cellY + rowHeight / 2,
                    colWidth,
                    rowHeight
                );


                if (this.selectedCell?.row === row && this.selectedCell.col === col) {
                    this.ctx.strokeStyle = "#137E43";
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(cellX, cellY, colWidth, rowHeight);
                    this.ctx.lineWidth = 1;
                }

                x += colWidth;
            }
            y += rowHeight;
        }

    }

    /**
     * To highlight the selected area in the grid
     * @param startRow Start row index of the visiable canvas
     * @param endRow end row index of the visiable canvas
     * @param startCol Start column index of the visiable canvas
     * @param endCol End column index of the visiable canvas
     * @param scrollTop Current scroll top of the grid
     * @param scrollLeft Current scroll left of the grid
     */
    highlightSelectedArea(startRow: number, endRow: number, startCol: number, endCol: number, scrollTop: number, scrollLeft: number) {

        if (this.selectedArea.startRow === null || this.selectedArea.startCol === null || this.selectedArea.endRow === null || this.selectedArea.endCol === null) return;

        const startAreaRow = Math.min(this.selectedArea.startRow, this.selectedArea.endRow);
        const endAreaRow = Math.max(this.selectedArea.startRow, this.selectedArea.endRow);
        const startAreaCol = Math.min(this.selectedArea.startCol, this.selectedArea.endCol);
        const endAreaCol = Math.max(this.selectedArea.startCol, this.selectedArea.endCol);

        for (let row = startAreaRow; row <= endAreaRow; row++) {
            if (row < startRow || row > endRow) continue;

            const y = (this.cumulativeRowHeights[row - 1] ?? 0) - scrollTop + this.colHeaderHeight;
            const rowHeight = this.rows[row].height;

            for (let col = startAreaCol; col <= endAreaCol; col++) {

                if (col < startCol || col > endCol) continue;

                const x = (this.cumulativeColWidths[col - 1] ?? 0) - scrollLeft + this.rowHeaderWidth;
                const colWidth = this.columns[col].width;


                this.ctx.fillStyle = "#E8F2EC";
                this.ctx.fillRect(x, y, colWidth, rowHeight);

                const cellRow = this.selectedCell?.row;
                const cellCol = this.selectedCell?.col;
                if (cellRow === row && cellCol === col) {
                    this.ctx.fillStyle = "white";
                    this.ctx.fillRect(x, y, colWidth, rowHeight);
                }
                // === Draw cell text in black
                const cell = this.getOrCreateCell(row, col);
                if (cell) {
                    this.ctx.fillStyle = "black";
                    this.renderText(
                        cell.text,
                        x + colWidth / 2,
                        y + rowHeight / 2,
                        colWidth,
                        rowHeight
                    );
                }

                this.ctx.beginPath();
                this.ctx.strokeStyle = "#ccc";
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x, y, colWidth, rowHeight);
                this.ctx.stroke();
                // === Border logic: Only outer rectangle gets green border
                const isTopEdge = row === startAreaRow;
                const isBottomEdge = row === endAreaRow;
                const isLeftEdge = col === startAreaCol;
                const isRightEdge = col === endAreaCol;

                this.ctx.strokeStyle = "#ccc";
                this.ctx.lineWidth = 1;

                if (isTopEdge) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = "#137E43";
                    this.ctx.lineWidth = 2;
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x + colWidth, y);
                    this.ctx.stroke();
                }

                if (isBottomEdge) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = "#137E43";
                    this.ctx.lineWidth = 2;
                    this.ctx.moveTo(x, y + rowHeight);
                    this.ctx.lineTo(x + colWidth, y + rowHeight);
                    this.ctx.stroke();
                }

                if (isLeftEdge) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = "#137E43";
                    this.ctx.lineWidth = 2;
                    this.ctx.moveTo(x, y);
                    this.ctx.lineTo(x, y + rowHeight);
                    this.ctx.stroke();
                }

                if (isRightEdge) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = "#137E43";
                    this.ctx.lineWidth = 2;
                    this.ctx.moveTo(x + colWidth, y);
                    this.ctx.lineTo(x + colWidth, y + rowHeight);
                    this.ctx.stroke();
                }
                this.ctx.lineWidth = 1;
            }
        }
    }

    /**
     * To draw grid lines 
     * @param startRow Start row index of the visiable canvas
     * @param endRow end row index of the visiable canvas
     * @param startCol Start column index of the visiable canvas
     * @param endCol End column index of the visiable canvas
     * @param scrollTop Current scroll top of the grid
     * @param scrollLeft Current scroll left of the grid
     */

    drawGridLines(startRow: number, endRow: number, startCol: number, endCol: number, scrollTop: number, scrollLeft: number) {


        // Horizontal lines
        let currentY = (this.cumulativeRowHeights[startRow - 1] ?? 0) - scrollTop + this.colHeaderHeight;
        for (let row = startRow; row <= endRow + 1; row++) {
            const rowHeight = this.rows[row]?.height || 0;

            this.ctx.beginPath();
            this.ctx.strokeStyle = "#ccc";

            this.ctx.moveTo(this.rowHeaderWidth, currentY + 0.5);
            this.ctx.lineTo(Math.min(this.canvas.width, this.sheetWidth - scrollLeft - (50 - this.rowHeaderWidth)), currentY + 0.5);
            this.ctx.stroke();

            currentY += rowHeight;
        }

        // Vertical lines
        let currentX = (this.cumulativeColWidths[startCol - 1] ?? 0) - scrollLeft + this.rowHeaderWidth;
        for (let col = startCol; col <= endCol + 1; col++) {
            const colWidth = this.columns[col]?.width || 0;
            this.ctx.beginPath();
            this.ctx.strokeStyle = "#ccc";
            this.ctx.moveTo(currentX + 0.5, this.colHeaderHeight);
            this.ctx.lineTo(currentX + 0.5, Math.min(this.canvas.width, this.sheetHeight - scrollTop));
            this.ctx.stroke();

            currentX += colWidth;
        }


        this.ctx.strokeStyle = "#ccc";
        this.ctx.stroke();
    }

    /**
     * To draw row headers 
     * @param startRow Start row index of the visiable canvas
     * @param endRow End row index of the visiable canvas
     * @param scrollTop Current scroll top of the grid
     */
    drawRowHeaders(startRow: number, endRow: number, scrollTop: number) {
        // === Draw row header background

        for (let row = startRow; row <= endRow; row++) {
            const y = this.colHeaderHeight + (this.cumulativeRowHeights[row - 1] ?? 0) - scrollTop;
            const height = this.rows[row].height;

            let isSelectedRow = false;
            if (this.selectedRows.endRow !== null && this.selectedRows.startRow !== null) {
                isSelectedRow = this.selectedRows.startRow <= row && this.selectedRows.endRow >= row;
            }
            const isSelectedCellRow = this.selectedCell?.row === row;

            const isInSelectedArea =
                this.selectedArea?.startRow !== null &&
                this.selectedArea?.endRow !== null &&
                (
                    (this.selectedArea.startRow <= row && row <= this.selectedArea.endRow) ||
                    (this.selectedArea.endRow <= row && row <= this.selectedArea.startRow)
                );

            // === Fill background
            if ((isSelectedCellRow || isInSelectedArea) && !isSelectedRow) {
                this.ctx.fillStyle = "#CAEAD8";
            } else if (isSelectedRow) {
                this.ctx.fillStyle = "#137E43";
            } else {
                this.ctx.fillStyle = "#f0f0f0";
            }
            this.ctx.fillRect(0.5, y + 0.5, this.rowHeaderWidth, height);

            // === Border
            this.ctx.strokeStyle = isSelectedRow ? "#137E43" : "#ccc";
            this.ctx.lineWidth = isSelectedRow ? 2 : 1;
            this.ctx.strokeRect(0.5, y + 0.5, this.rowHeaderWidth, height);

            if (isSelectedRow && this.selectedRows.endRow !== row) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 3;
                this.ctx.moveTo(0.5, y + height + 0.5);
                this.ctx.lineTo(this.rowHeaderWidth + 0.5, y + height + 0.5);
                this.ctx.stroke();
            }

            // === Right edge highlight if selected
            if (isSelectedCellRow || isInSelectedArea && !isSelectedRow) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "#137E43";
                this.ctx.lineWidth = 2;
                this.ctx.moveTo(this.rowHeaderWidth + 0.5, y + 0.5);
                this.ctx.lineTo(this.rowHeaderWidth + 0.5, y + height + 0.5);
                this.ctx.stroke();
            }

            // === Draw row number
            this.ctx.fillStyle = isSelectedRow ? "white" : "black";
            this.ctx.textAlign = "left";
            this.ctx.textBaseline = "middle";

            const rowIndexStr = (endRow + 1).toString();
            const padding = 2;
            const textWidth = this.ctx.measureText(rowIndexStr).width;
            const textX = this.rowHeaderWidth - textWidth - padding;

            this.ctx.fillText((row + 1).toString(), textX, y + height / 2);
        }
    }

    /**
     * To draw corner box of the grid
     */
    drawCornorBox() {
        this.ctx.strokeStyle = "#ccc";
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0.5, 0.5, this.rowHeaderWidth, this.colHeaderHeight);
    }

    /**
     * To draw column headers
     * @param startCol Start column index of the visiable canvas
     * @param endCol End column index of the visiable canvas
     * @param scrollLeft Current scroll left of the grid
     */
    drawColumnHeaders(startCol: number, endCol: number, scrollLeft: number) {
        this.ctx.fillStyle = "black";
        for (let col = startCol; col <= endCol; col++) {
            const x = this.rowHeaderWidth + (this.cumulativeColWidths[col - 1] ?? 0) - scrollLeft;
            const width = this.columns[col].width;

            const isInSelectedArea =
                this.selectedArea?.startCol !== null &&
                this.selectedArea?.endCol !== null &&
                (
                    (this.selectedArea.startCol <= col && col <= this.selectedArea.endCol) ||
                    (this.selectedArea.endCol <= col && col <= this.selectedArea.startCol)
                );

            const isSelectedCellCol = this.selectedCell?.col === col;

            let isFullySelectedCol = false;
            if (this.selectedCols.startCol !== null && this.selectedCols.endCol !== null) {
                isFullySelectedCol = this.selectedCols.startCol <= col && this.selectedCols.endCol >= col;
            }

            // === Set background fill color
            if ((isSelectedCellCol || isInSelectedArea) && !isFullySelectedCol) {
                this.ctx.fillStyle = "#CAEAD8";
            } else if (isFullySelectedCol) {
                this.ctx.fillStyle = "#137E43";
            } else {
                this.ctx.fillStyle = "#f0f0f0";
            }

            this.ctx.fillRect(x + 0.5, 0 + 0.5, width, this.colHeaderHeight);

            // === Set border style
            if (isFullySelectedCol) {
                this.ctx.strokeStyle = "#137E43";
                this.ctx.lineWidth = 2;
            } else {
                this.ctx.strokeStyle = "#ccc";
                this.ctx.lineWidth = 1;
            }
            this.ctx.strokeRect(x + 0.5, 0 + 0.5, width, this.colHeaderHeight);

            // === Bottom border if part of selected area or cell
            if (isSelectedCellCol || isInSelectedArea && !isFullySelectedCol) {
                this.ctx.strokeStyle = "#137E43";
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x + 0.5, this.colHeaderHeight + 0.5);
                this.ctx.lineTo(x + width + 0.5, this.colHeaderHeight + 0.5);
                this.ctx.stroke();
            }

            if (isFullySelectedCol && this.selectedCols.endCol !== col) {
                this.ctx.strokeStyle = "white";
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x + width + 0.5, 0.5);
                this.ctx.lineTo(x + width + 0.5, this.colHeaderHeight + 0.5);
                this.ctx.stroke();
            }

            // === Draw column label text
            this.ctx.fillStyle = isFullySelectedCol ? "white" : "black";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";

            this.ctx.fillText(
                this.columns[col].label,
                x + width / 2,
                this.colHeaderHeight / 2
            );

        }

    }

    /**
     * To calculate Selected area status like count, sum, min, max, avg
     */
    calculateAreaStatus() {

        const { startRow, endRow, startCol, endCol } = this.selectedArea;
        if (startRow === null || endRow === null || startCol === null || endCol === null) {
            if (this.selectedCell?.row && this.selectedCell.col) {
                const cell = this.getOrCreateCell(this.selectedCell.row, this.selectedCell.col);

                this.renderAreaStatus({
                    count: 1,
                    sum: !isNaN(parseFloat(cell.text)) ? parseFloat(cell.text) : null,
                    min: !isNaN(parseFloat(cell.text)) ? parseFloat(cell.text) : null,
                    max: !isNaN(parseFloat(cell.text)) ? parseFloat(cell.text) : null,
                    avg: !isNaN(parseFloat(cell.text)) ? parseFloat(cell.text) : null
                });
            }
            return;
        }
        let numericValues: number[] = [];
        let totalCount = 0;

        for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row++) {
            for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
                const cell = this.getOrCreateCell(row, col);
                if (!cell || cell.text.trim() === "") continue;

                totalCount++;

                const num = parseFloat(cell.text);
                if (!isNaN(num)) {
                    numericValues.push(num);
                }
            }
        }

        const count = totalCount;
        const numericCount = numericValues.length;
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const min = numericCount > 0 ? Math.min(...numericValues) : null;
        const max = numericCount > 0 ? Math.max(...numericValues) : null;
        const avg = numericCount > 0 ? sum / numericCount : null;

        this.renderAreaStatus({ count, sum, min, max, avg });
    }

    /**
     * To render selected area status like count, sum, min, max, avg in UI
     * @param stats Selected area status like count, sum, min, max, avg
     */
    renderAreaStatus(stats: {
        count: number;
        sum: number | null;
        min: number | null;
        max: number | null;
        avg: number | null;
    }): void {

        const updateElement = (selector: string, value: number | null) => {
            const container = document.querySelector(selector) as HTMLElement;
            if (!container) return;

            if (value === null) {
                container.style.display = "none";
            } else {
                const valueEl = container.querySelector(".counter-value") as HTMLElement;
                valueEl.textContent = selector === ".avg-item" ? value.toFixed(3) : value.toString();
                container.style.display = "flex";
            }
        };

        // Count should always be shown (even if 0)
        const countContainer = document.querySelector(".count-item") as HTMLElement;
        const countValue = countContainer?.querySelector(".count-value") as HTMLElement;
        if (countContainer && countValue) {
            countValue.textContent = stats.count.toString();
            countContainer.style.display = "flex";
        }

        // Update other stats
        updateElement(".min-item", stats.min);
        updateElement(".max-item", stats.max);
        updateElement(".sum-item", stats.sum);
        updateElement(".avg-item", stats.avg);
    }

    /**
     * Add new row
     * @param atIndex Index to add row
     */
    addRow(atIndex: number) {
        const newCells = new Map();

        for (const [rowIdx, rowMap] of this.cells) {
            const newIndex = rowIdx >= atIndex ? rowIdx + 1 : rowIdx;
            newCells.set(newIndex, rowMap);
        }

        this.cells = newCells;
        this.cells.set(atIndex, new Map());
        this.rows.splice(atIndex, 0, new Row(30, atIndex));

        const virtualArea = document.querySelector(".virtual-canvas-area") as HTMLElement;
        const addedHeight = this.rows[atIndex].height;
        this.sheetHeight += addedHeight;
        virtualArea.style.height = `${this.sheetHeight}px`;
        this.updateCumulativeSizes();
        this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);
    }

    /**
     * Add new column
     * @param index Index to add column
     */
    addColumn(index: number) {
        const newColumn = new Column(index);
        this.columns.splice(index, 0, newColumn);

        for (let i = index + 1; i < this.columns.length; i++) {
            this.columns[i].updateIndex(i);
        }

        // 3. Shift cells to the right and insert blank cell in new column
        for (const [rowIndex, colMap] of this.cells.entries()) {
            const newColMap = new Map<number, Cell>();

            for (const [colIndex, cell] of colMap.entries()) {
                if (colIndex >= index) {
                    newColMap.set(colIndex + 1, cell);
                } else {
                    newColMap.set(colIndex, cell);
                }
            }

            const blankCell = new Cell("", rowIndex, index);
            newColMap.set(index, blankCell);

            this.cells.set(rowIndex, newColMap);
        }

        const virtualArea = document.querySelector(".virtual-canvas-area") as HTMLElement;
        const addedWidth = this.columns[index].width;
        this.sheetWidth += addedWidth;
        virtualArea.style.width = `${this.sheetWidth}px`;

        this.updateCumulativeSizes();
        this.redrawVisible(this.container.scrollTop, this.container.scrollLeft);
    }

    scrollIntoView(row: number, col: number) {
        const container = this.container;
        const scrollTop = container.scrollTop;
        const scrollLeft = container.scrollLeft;
        const viewWidth = container.clientWidth;
        const viewHeight = container.clientHeight;

        const cellX = this.cumulativeColWidths[col - 1] ?? 0 + this.rowHeaderWidth;
        const cellY = this.cumulativeRowHeights[row - 1] ?? 0 + this.colHeaderHeight;

        const cellWidth = this.columns[col].width;
        const cellHeight = this.rows[row].height;

        const headerOffsetX = this.rowHeaderWidth;
        const headerOffsetY = this.colHeaderHeight;

        let newScrollLeft = scrollLeft;
        let newScrollTop = scrollTop;

        // Horizontal scroll check
        if (cellX < scrollLeft) {
            newScrollLeft = cellX;
        } else if (cellX + cellWidth > scrollLeft + viewWidth - headerOffsetX) {
            newScrollLeft = cellX + cellWidth - viewWidth + headerOffsetX;
        }

        // Vertical scroll check
        if (cellY < scrollTop) {
            newScrollTop = cellY;
        } else if (cellY + cellHeight > scrollTop + viewHeight - headerOffsetY) {
            newScrollTop = cellY + cellHeight - viewHeight + headerOffsetY;
        }

        container.scrollLeft = newScrollLeft;
        container.scrollTop = newScrollTop;
    }

}

export { ExcelSheet };