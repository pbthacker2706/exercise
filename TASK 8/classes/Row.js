/**
 * Represents a single row in the grid.
 */
export class Row {
  /**
   * Initializes a row with its index and height
   * @param {number} index - Row index
   * @param {number} height - Row height
   */
  constructor(index, height = 24) {
    /** @type {number} */
    this.index = index;
    /** @type {number} */
    this.height = height;
  }
}
