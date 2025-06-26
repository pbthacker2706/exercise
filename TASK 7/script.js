class CanvasManager {
  constructor() {
    this.canvas = document.createElement("div");
    this.canvas.style.position = "absolute";
    this.canvas.style.left = "0";
    this.canvas.style.top = "0";
    this.canvas.style.backgroundColor = "black";
    this.canvas.style.overflow = "hidden";
    document.body.appendChild(this.canvas);

    this.resize(); // Initial sizing
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
  }

  get element() {
    return this.canvas;
  }

  get width() {
    return this.canvas.clientWidth;
  }

  get height() {
    return this.canvas.clientHeight;
  }
}

class DraggableBox {
  constructor(parent, size = 50, initialX = 0, initialY = 0) {
    this.box = document.createElement("div");
    this.size = size;
    this.parent = parent;

    Object.assign(this.box.style, {
      width: size + "px",
      height: size + "px",
      backgroundColor: "white",
      position: "absolute",
      left: initialX + "px",
      top: initialY + "px",
      touchAction: "none",
    });

    this.dragging = false;
    this.offsetX = 0;
    this.offsetY = 0;

    parent.appendChild(this.box);
    this.addEventListeners();
  }

  addEventListeners() {
    this.box.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.box.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.box.addEventListener("pointerup", () => this.onPointerUp());
    this.box.addEventListener("pointercancel", () => this.onPointerUp());
    window.addEventListener("resize", () => this.repositionIfOutOfBounds());
  }

  onPointerDown(e) {
    this.dragging = true;
    this.offsetX = e.clientX - this.box.offsetLeft;
    this.offsetY = e.clientY - this.box.offsetTop;
    this.box.setPointerCapture(e.pointerId);
  }

  onPointerMove(e) {
    if (!this.dragging) return;

    const maxX = this.parent.clientWidth - this.size;
    const maxY = this.parent.clientHeight - this.size;

    let newX = e.clientX - this.offsetX;
    let newY = e.clientY - this.offsetY;

    newX = this.clamp(newX, 0, maxX);
    newY = this.clamp(newY, 0, maxY);

    this.box.style.left = newX + "px";
    this.box.style.top = newY + "px";
  }

  onPointerUp() {
    this.dragging = false;
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(val, max));
  }

  repositionIfOutOfBounds() {
    const maxX = this.parent.clientWidth - this.size;
    const maxY = this.parent.clientHeight - this.size;

    const currentX = parseInt(this.box.style.left);
    const currentY = parseInt(this.box.style.top);

    const newX = this.clamp(currentX, 0, maxX);
    const newY = this.clamp(currentY, 0, maxY);

    this.box.style.left = newX + "px";
    this.box.style.top = newY + "px";
  }
}

// Initialize canvas and draggable box
const canvasManager = new CanvasManager();
const box = new DraggableBox(canvasManager.element);
