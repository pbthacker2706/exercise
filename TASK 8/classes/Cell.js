/**
 * Represents an individual cell in the grid.
 */
export class Cell {
  /**
   * Initializes the cell with data and position
   * @param {number} rowIndex 
   * @param {number} colIndex 
   * @param {*} value - Any type of value
   */
  constructor(rowIndex, colIndex, value = '') {
    /** @type {number} */
    this.rowIndex = rowIndex;

    /** @type {number} */
    this.colIndex = colIndex;

    /** @type {*} */
    this.value = value;
  }
}
