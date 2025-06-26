/**
 * Command for resizing rows or columns
 */
export class ResizeCommand {
  constructor(target, dimension, oldSize, newSize) {
    this.target = target; // either Row or Column object
    this.dimension = dimension; // 'width' or 'height'
    this.oldSize = oldSize;
    this.newSize = newSize;
  }

  execute() {
    this.target[this.dimension] = this.newSize;
  }

  undo() {
    this.target[this.dimension] = this.oldSize;
  }
}
