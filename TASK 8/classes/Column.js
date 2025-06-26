/**
 * Represents a single column in the grid.
 */
export class Column {
  /**
   * Initializes a column with its index and width
   * @param {number} index - Column index
   * @param {number} width - Column width
   */
  constructor(index, width = 100) {
    /** @type {number} */
    this.index = index;
    /** @type {number} */
    this.width = width;
  }
}
