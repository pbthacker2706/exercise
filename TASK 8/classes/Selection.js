/**
 * Manages the current cell, row, or column selection.
 */
export class Selection {
  constructor() {
    /** @type {{row: number, col: number} | null} */
    this.activeCell = null;

    /** @type {{startRow: number, startCol: number, endRow: number, endCol: number} | null} */
    this.range = null;
  }

  /**
   * Set single cell as selected
   */
  selectCell(row, col) {
    this.activeCell = { row, col };
    this.range = null;
  }

  /**
   * Set a rectangular range as selected
   */
  selectRange(startRow, startCol, endRow, endCol) {
    this.range = { startRow, startCol, endRow, endCol };
    this.activeCell = null;
  }

  clearSelection() {
    this.activeCell = null;
    this.range = null;
  }
}
