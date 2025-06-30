import { Selection } from "./Selection.js";
import { EditCommand } from "./commands/EditCommand.js";

/**
 * Main Grid class responsible for rendering the excel-like canvas grid.
 */
export class Grid {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.totalRows = 100000;
    this.totalCols = 500;

    // Use arrays for per-column width and per-row height
    this.colWidths = Array(this.totalCols).fill(100);
    this.rowHeights = Array(this.totalRows).fill(24);
    this.headerHeight = 24;
    this.headerWidth = 50;

    this.scrollX = 0;
    this.scrollY = 0;

    this.data = {};
    this.selection = new Selection();

    this._bindScroll();
    this._bindClick();
    this._bindKeyboard(); // 🔧 new
    this._bindDoubleClick();
  }

  getColumnName(index) {
    let name = "";
    while (index >= 0) {
      name = String.fromCharCode((index % 26) + 65) + name;
      index = Math.floor(index / 26) - 1;
    }
    return name;
  }

  _bindScroll() {
    window.addEventListener("wheel", (e) => {
      this.scrollX += e.deltaX;
      this.scrollY += e.deltaY;

      this._clampScroll();
      this.render();
    });
  }

  _bindClick() {
    const canvas = document.getElementById("excelCanvas");
    let isDragging = false;
    let startCell = null;
    let resizing = null; // {type: 'col'|'row', index: number, start: number, origSize: number}

    canvas.addEventListener("mousedown", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + this.scrollX;
      const y = e.clientY - rect.top + this.scrollY;

      // Column resize detection (on header border)
      if (y < this.headerHeight) {
        let colLeft = this.headerWidth;
        for (let c = 0; c < this.totalCols; c++) {
          if (Math.abs(x - (colLeft + this.colWidths[c])) < 4) {
            resizing = { type: 'col', index: c, start: x, origSize: this.colWidths[c] };
            document.body.style.cursor = 'col-resize';
            return;
          }
          colLeft += this.colWidths[c];
        }
      }
      // Row resize detection (on header border)
      if (x < this.headerWidth) {
        let rowTop = this.headerHeight;
        for (let r = 0; r < this.totalRows; r++) {
          if (Math.abs(y - (rowTop + this.rowHeights[r])) < 4) {
            resizing = { type: 'row', index: r, start: y, origSize: this.rowHeights[r] };
            document.body.style.cursor = 'row-resize';
            return;
          }
          rowTop += this.rowHeights[r];
        }
      }
      // Column header click (select column)
      if (y < this.headerHeight && x > this.headerWidth) {
        let colLeft = this.headerWidth;
        let col = -1;
        for (let c = 0; c < this.totalCols; c++) {
          if (x < colLeft + this.colWidths[c]) {
            col = c;
            break;
          }
          colLeft += this.colWidths[c];
        }
        if (col >= 0) {
          this.selection.activeCell = { row: 0, col };
          this.selection.anchorCell = { row: this.totalRows - 1, col };
          this.render();
          return;
        }
      }
      // Row header click (select row)
      if (x < this.headerWidth && y > this.headerHeight) {
        let rowTop = this.headerHeight;
        let row = -1;
        for (let r = 0; r < this.totalRows; r++) {
          if (y < rowTop + this.rowHeights[r]) {
            row = r;
            break;
          }
          rowTop += this.rowHeights[r];
        }
        if (row >= 0) {
          this.selection.activeCell = { row, col: 0 };
          this.selection.anchorCell = { row, col: this.totalCols - 1 };
          this.render();
          return;
        }
      }
      // Cell selection
      let colLeft = this.headerWidth;
      let col = -1;
      for (let c = 0; c < this.totalCols; c++) {
        if (x < colLeft + this.colWidths[c]) {
          col = c;
          break;
        }
        colLeft += this.colWidths[c];
      }
      let rowTop = this.headerHeight;
      let row = -1;
      for (let r = 0; r < this.totalRows; r++) {
        if (y < rowTop + this.rowHeights[r]) {
          row = r;
          break;
        }
        rowTop += this.rowHeights[r];
      }
      if (row >= 0 && col >= 0) {
        isDragging = true;
        startCell = { row, col };
        this.selection.selectCell(row, col);
        this._selectAndFocus(row, col);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (resizing) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollX;
        const y = e.clientY - rect.top + this.scrollY;
        if (resizing.type === 'col') {
          this.colWidths[resizing.index] = Math.max(20, resizing.origSize + (x - resizing.start));
        } else if (resizing.type === 'row') {
          this.rowHeights[resizing.index] = Math.max(10, resizing.origSize + (y - resizing.start));
        }
        this.render();
        return;
      }
      if (!isDragging || !startCell) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + this.scrollX;
      const y = e.clientY - rect.top + this.scrollY;
      let col = -1;
      let colLeft = this.headerWidth;
      for (let c = 0; c < this.totalCols; c++) {
        if (x < colLeft + this.colWidths[c]) {
          col = c;
          break;
        }
        colLeft += this.colWidths[c];
      }
      let row = -1;
      let rowTop = this.headerHeight;
      for (let r = 0; r < this.totalRows; r++) {
        if (y < rowTop + this.rowHeights[r]) {
          row = r;
          break;
        }
        rowTop += this.rowHeights[r];
      }
      if (row >= 0 && col >= 0) {
        this.selection.anchorCell = { ...startCell };
        this.selection.activeCell = { row, col };
        this.render();
      }
    });

    window.addEventListener("mouseup", () => {
      if (resizing) {
        resizing = null;
        document.body.style.cursor = '';
      }
      isDragging = false;
      startCell = null;
    });
  }

  // 🔧 New: Bind arrow keys for navigation
  _bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (!this.selection.activeCell) return;
      let { row, col } = this.selection.activeCell;
      let isRange = e.shiftKey;
      // Copy (Ctrl+C)
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const range = this.selection.getRange();
        let text = '';
        for (let r = range.startRow; r <= range.endRow; r++) {
          let rowVals = [];
          for (let c2 = range.startCol; c2 <= range.endCol; c2++) {
            rowVals.push(this.data[`${r},${c2}`] || '');
          }
          text += rowVals.join('\t');
          if (r < range.endRow) text += '\n';
        }
        navigator.clipboard.writeText(text);
        e.preventDefault();
        return;
      }
      // Paste (Ctrl+V)
      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        navigator.clipboard.readText().then(text => {
          if (!text) return;
          const rows = text.split(/\r?\n/);
          const range = this.selection.getRange();
          let startRow = range ? range.startRow : row;
          let startCol = range ? range.startCol : col;
          for (let r = 0; r < rows.length; r++) {
            const cells = rows[r].split('\t');
            for (let c2 = 0; c2 < cells.length; c2++) {
              this.updateCell(startRow + r, startCol + c2, cells[c2]);
            }
          }
        });
        e.preventDefault();
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          row = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          row = Math.min(this.totalRows - 1, row + 1);
          break;
        case "ArrowLeft":
          col = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          col = Math.min(this.totalCols - 1, col + 1);
          break;
        default:
          return;
      }
      this.selection.selectCell(row, col, isRange);
      this._selectAndFocus(row, col, isRange);
    });
  }

  // 🔧 New: Scrolls into view and selects
  _selectAndFocus(row, col, isRange = false) {
    this.selection.selectCell(row, col, isRange);
    document.getElementById(
      "selected-cell"
    ).textContent = `Selected: ${this.getColumnName(col)}${row + 1}`;

    const left = col * this.colWidths[col];
    const top = row * this.rowHeights[row];

    if (left < this.scrollX) {
      this.scrollX = left;
    } else if (
      left + this.colWidths[col] >
      this.scrollX + this.width - this.headerWidth
    ) {
      this.scrollX = left - (this.width - this.headerWidth - this.colWidths[col]);
    }

    if (top < this.scrollY) {
      this.scrollY = top;
    } else if (
      top + this.rowHeights[row] >
      this.scrollY + this.height - this.headerHeight
    ) {
      this.scrollY = top - (this.height - this.headerHeight - this.rowHeights[row]);
    }

    this._clampScroll();
    this.render();
  }

  // 🔧 New: clamp scroll
  _clampScroll() {
    this.scrollX = Math.max(
      0,
      Math.min(this.scrollX, this.totalCols * this.colWidths[0] - this.width)
    );
    this.scrollY = Math.max(
      0,
      Math.min(this.scrollY, this.totalRows * this.rowHeights[0] - this.height)
    );
  }

  getVisibleRange() {
    // Calculate visible columns and rows based on scroll and per-column/row sizes
    let x = 0, y = 0, startCol = 0, endCol = 0, startRow = 0, endRow = 0;
    let accX = 0;
    // Find startCol
    for (let c = 0; c < this.totalCols; c++) {
      if (accX + this.colWidths[c] > this.scrollX) {
        startCol = c;
        break;
      }
      accX += this.colWidths[c];
    }
    // Find endCol
    let visX = accX;
    for (let c = startCol; c < this.totalCols; c++) {
      visX += this.colWidths[c];
      if (visX - this.scrollX > this.width - this.headerWidth) {
        endCol = c + 1;
        break;
      }
    }
    if (endCol === 0) endCol = this.totalCols;

    // Find startRow
    let accY = 0;
    for (let r = 0; r < this.totalRows; r++) {
      if (accY + this.rowHeights[r] > this.scrollY) {
        startRow = r;
        break;
      }
      accY += this.rowHeights[r];
    }
    // Find endRow
    let visY = accY;
    for (let r = startRow; r < this.totalRows; r++) {
      visY += this.rowHeights[r];
      if (visY - this.scrollY > this.height - this.headerHeight) {
        endRow = r + 1;
        break;
      }
    }
    if (endRow === 0) endRow = this.totalRows;

    return { startRow, endRow, startCol, endCol };
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(
      -this.scrollX + this.headerWidth,
      -this.scrollY + this.headerHeight
    );

    const { startRow, endRow, startCol, endCol } = this.getVisibleRange();

    this.ctx.font = "12px sans-serif";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";

    // Calculate x positions for columns
    let colXs = [];
    let x = 0;
    for (let c = 0; c < this.totalCols; c++) {
      colXs[c] = x;
      x += this.colWidths[c];
    }
    // Calculate y positions for rows
    let rowYs = [];
    let y = 0;
    for (let r = 0; r < this.totalRows; r++) {
      rowYs[r] = y;
      y += this.rowHeights[r];
    }

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const x = colXs[c];
        const y = rowYs[r];
        this.ctx.strokeStyle = "#ccc";
        this.ctx.strokeRect(x, y, this.colWidths[c], this.rowHeights[r]);
        const value = this.data[`${r},${c}`] || "";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(
          value,
          x + this.colWidths[c] / 2,
          y + this.rowHeights[r] / 2
        );
        // Highlight selection range
        if (this.selection.isCellInRange(r, c)) {
          this.ctx.save();
          this.ctx.strokeStyle = "#3399ff";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(
            x + 1,
            y + 1,
            this.colWidths[c] - 2,
            this.rowHeights[r] - 2
          );
          this.ctx.globalAlpha = 0.1;
          this.ctx.fillStyle = "#3399ff";
          this.ctx.fillRect(
            x + 1,
            y + 1,
            this.colWidths[c] - 2,
            this.rowHeights[r] - 2
          );
          this.ctx.globalAlpha = 1.0;
          this.ctx.restore();
        }
        if (
          this.selection.activeCell?.row === r &&
          this.selection.activeCell?.col === c
        ) {
          this.ctx.strokeStyle = "#0078d4";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x, y, this.colWidths[c], this.rowHeights[r]);
          this.ctx.lineWidth = 1;
        }
      }
    }
    this.ctx.restore();

    // Column headers
    let colX = this.headerWidth - this.scrollX;
    for (let c = startCol; c < endCol; c++) {
      const w = this.colWidths[c];
      this.ctx.fillStyle = "#f0f0f0";
      this.ctx.fillRect(colX, 0, w, this.headerHeight);
      this.ctx.strokeStyle = "#ccc";
      this.ctx.strokeRect(colX, 0, w, this.headerHeight);
      const colName = this.getColumnName(c);
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(colName, colX + w / 2, this.headerHeight / 2);
      colX += w;
    }

    // Row headers
    let rowY = this.headerHeight - this.scrollY;
    for (let r = startRow; r < endRow; r++) {
      const h = this.rowHeights[r];
      this.ctx.fillStyle = "#f0f0f0";
      this.ctx.fillRect(0, rowY, this.headerWidth, h);
      this.ctx.strokeStyle = "#ccc";
      this.ctx.strokeRect(0, rowY, this.headerWidth, h);
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(r + 1, this.headerWidth / 2, rowY + h / 2);
      rowY += h;
    }

    // Corner
    this.ctx.fillStyle = "#e0e0e0";
    this.ctx.fillRect(0, 0, this.headerWidth, this.headerHeight);
    this.ctx.strokeStyle = "#ccc";
    this.ctx.strokeRect(0, 0, this.headerWidth, this.headerHeight);
  }

  updateCell(row, col, value) {
    this.data[`${row},${col}`] = value;
    this.render();
  }
  _bindDoubleClick() {
    const canvas = document.getElementById("excelCanvas");

    canvas.addEventListener("dblclick", (e) => {
      if (!this.selection.activeCell) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const row = this.selection.activeCell.row;
      const col = this.selection.activeCell.col;

      // Calculate left position by summing widths of previous columns
      let cellX = this.headerWidth;
      for (let i = 0; i < col; i++) cellX += this.colWidths[i];
      cellX -= this.scrollX;
      // Calculate top position by summing heights of previous rows
      let cellY = this.headerHeight;
      for (let i = 0; i < row; i++) cellY += this.rowHeights[i];
      cellY -= this.scrollY;
      // Add header and toolbar heights (header: 40px, formula bar: 32px, toolbar: 30px)
      cellY += 40 + 32 + 30;

      const input = document.createElement("input");
      input.type = "text";
      input.value = this.data[`${row},${col}`] || "";
      input.style.position = "absolute";
      input.style.left = `${cellX}px`;
      input.style.top = `${cellY}px`;
      input.style.width = `${this.colWidths[col]}px`;
      input.style.height = `${this.rowHeights[row]}px`;
      input.style.fontSize = "12px";
      input.style.padding = "2px";
      input.style.border = "1px solid blue";
      input.style.zIndex = 10;
      input.style.boxSizing = "border-box";

      document.body.appendChild(input);
      input.focus();

      const onSubmit = () => {
        const oldValue = this.data[`${row},${col}`] || "";
        const newValue = input.value;

        if (oldValue !== newValue) {
          const command = new EditCommand(this, row, col, oldValue, newValue);
          this.commandManager.execute(command);
        }

        document.body.removeChild(input);
      };

      input.addEventListener("blur", onSubmit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          input.blur();
        }
      });
    });
  }
}

/**
 * Handles double-click for cell editing.
 */
