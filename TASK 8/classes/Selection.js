/**
 * Manages the current cell, row, or column selection.
 */
export class Selection {
  constructor() {
    this.activeCell = null; // {row, col}
    this.anchorCell = null; // {row, col} for range selection
  }

  /**
   * Set single cell as selected
   */
  selectCell(row, col, isRange = false) {
    if (!isRange) {
      this.activeCell = { row, col };
      this.anchorCell = { row, col };
    } else {
      this.activeCell = { row, col };
    }
  }

  getRange() {
    if (!this.activeCell || !this.anchorCell) return null;
    const r1 = Math.min(this.activeCell.row, this.anchorCell.row);
    const r2 = Math.max(this.activeCell.row, this.anchorCell.row);
    const c1 = Math.min(this.activeCell.col, this.anchorCell.col);
    const c2 = Math.max(this.activeCell.col, this.anchorCell.col);
    return { startRow: r1, endRow: r2, startCol: c1, endCol: c2 };
  }

  isCellInRange(row, col) {
    const range = this.getRange();
    if (!range) return false;
    return (
      row >= range.startRow && row <= range.endRow &&
      col >= range.startCol && col <= range.endCol
    );
  }
}
