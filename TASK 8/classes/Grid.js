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

    this.cellWidth = 100;
    this.cellHeight = 24;
    this.headerHeight = 24;
    this.headerWidth = 50;

    this.totalRows = 100000;
    this.totalCols = 500;

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

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const col = Math.floor(
        (x + this.scrollX - this.headerWidth) / this.cellWidth
      );
      const row = Math.floor(
        (y + this.scrollY - this.headerHeight) / this.cellHeight
      );

      if (row >= 0 && col >= 0) {
        this._selectAndFocus(row, col);
      }
    });
  }

  // 🔧 New: Bind arrow keys for navigation
  _bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (!this.selection.activeCell) return;

      let { row, col } = this.selection.activeCell;

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

      this._selectAndFocus(row, col);
    });
  }

  // 🔧 New: Scrolls into view and selects
  _selectAndFocus(row, col) {
    this.selection.selectCell(row, col);
    document.getElementById(
      "selected-cell"
    ).textContent = `Selected: ${this.getColumnName(col)}${row + 1}`;

    const left = col * this.cellWidth;
    const top = row * this.cellHeight;

    if (left < this.scrollX) {
      this.scrollX = left;
    } else if (
      left + this.cellWidth >
      this.scrollX + this.width - this.headerWidth
    ) {
      this.scrollX = left - (this.width - this.headerWidth - this.cellWidth);
    }

    if (top < this.scrollY) {
      this.scrollY = top;
    } else if (
      top + this.cellHeight >
      this.scrollY + this.height - this.headerHeight
    ) {
      this.scrollY = top - (this.height - this.headerHeight - this.cellHeight);
    }

    this._clampScroll();
    this.render();
  }

  // 🔧 New: clamp scroll
  _clampScroll() {
    this.scrollX = Math.max(
      0,
      Math.min(this.scrollX, this.totalCols * this.cellWidth - this.width)
    );
    this.scrollY = Math.max(
      0,
      Math.min(this.scrollY, this.totalRows * this.cellHeight - this.height)
    );
  }

  getVisibleRange() {
    const startCol = Math.floor(this.scrollX / this.cellWidth);
    const endCol = Math.min(
      this.totalCols,
      startCol + Math.ceil((this.width - this.headerWidth) / this.cellWidth)
    );
    const startRow = Math.floor(this.scrollY / this.cellHeight);
    const endRow = Math.min(
      this.totalRows,
      startRow + Math.ceil((this.height - this.headerHeight) / this.cellHeight)
    );
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

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const x = c * this.cellWidth;
        const y = r * this.cellHeight;

        this.ctx.strokeStyle = "#ccc";
        this.ctx.strokeRect(x, y, this.cellWidth, this.cellHeight);

        const value = this.data[`${r},${c}`] || "";
        this.ctx.fillStyle = "#000";
        this.ctx.fillText(
          value,
          x + this.cellWidth / 2,
          y + this.cellHeight / 2
        );

        if (
          this.selection.activeCell?.row === r &&
          this.selection.activeCell?.col === c
        ) {
          this.ctx.strokeStyle = "#0078d4";
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(x, y, this.cellWidth, this.cellHeight);
          this.ctx.lineWidth = 1;
        }
      }
    }

    this.ctx.restore();

    // Column headers
    for (let c = startCol; c < endCol; c++) {
      const x = this.headerWidth + c * this.cellWidth - this.scrollX;
      this.ctx.fillStyle = "#f0f0f0";
      this.ctx.fillRect(x, 0, this.cellWidth, this.headerHeight);
      this.ctx.strokeStyle = "#ccc";
      this.ctx.strokeRect(x, 0, this.cellWidth, this.headerHeight);

      const colName = this.getColumnName(c);
      this.ctx.fillStyle = "#000";
      this.ctx.fillText(colName, x + this.cellWidth / 2, this.headerHeight / 2);
    }

    // Row headers
    for (let r = startRow; r < endRow; r++) {
      const y = this.headerHeight + r * this.cellHeight - this.scrollY;
      this.ctx.fillStyle = "#f0f0f0";
      this.ctx.fillRect(0, y, this.headerWidth, this.cellHeight);
      this.ctx.strokeStyle = "#ccc";
      this.ctx.strokeRect(0, y, this.headerWidth, this.cellHeight);

      this.ctx.fillStyle = "#000";
      this.ctx.fillText(r + 1, this.headerWidth / 2, y + this.cellHeight / 2);
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

      const cellX = this.headerWidth + col * this.cellWidth - this.scrollX+8;
      const cellY = this.headerHeight + row * this.cellHeight - this.scrollY + 44;

      const input = document.createElement("input");
      input.type = "text";
      input.value = this.data[`${row},${col}`] || "";
      input.style.position = "absolute";
      input.style.left = `${cellX}px`;
input.style.top = `${cellY }px`;
      input.style.width = `${this.cellWidth }px`;
      input.style.height = `${this.cellHeight }px`;
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
