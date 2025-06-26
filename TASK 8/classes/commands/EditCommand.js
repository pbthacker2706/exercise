/**
 * Represents a cell edit action that can be undone/redone.
 */
export class EditCommand {
  /*
   */
  constructor(grid, row, col, oldValue, newValue) {
    this.grid = grid;
    this.row = row;
    this.col = col;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  execute() {
    this.grid.updateCell(this.row, this.col, this.newValue);
  }

  undo() {
    this.grid.updateCell(this.row, this.col, this.oldValue);
  }
}
