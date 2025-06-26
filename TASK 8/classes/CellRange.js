/**
 * Represents a group of selected cells (a range).
 */
export class CellRange {
  /**
   * Creates a range from start to end indices
   * @param {number} startRow 
   * @param {number} startCol 
   * @param {number} endRow 
   * @param {number} endCol 
   */
  constructor(startRow, startCol, endRow, endCol) {
    this.startRow = Math.min(startRow, endRow);
    this.endRow = Math.max(startRow, endRow);
    this.startCol = Math.min(startCol, endCol);
    this.endCol = Math.max(startCol, endCol);
  }

  /**
   * Gets all cell positions inside the range
   * @returns {Array<{row: number, col: number}>}
   */
  getCells() {
    const cells = [];
    for (let row = this.startRow; row <= this.endRow; row++) {
      for (let col = this.startCol; col <= this.endCol; col++) {
        cells.push({ row, col });
      }
    }
    return cells;
  }
}
