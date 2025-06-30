import { Grid } from './classes/Grid.js';
import { CommandManager } from './classes/CommandManager.js';

const canvas = document.getElementById('excelCanvas');
const ctx = canvas.getContext('2d');

const grid = new Grid(ctx, 0, 0);
grid.commandManager = new CommandManager();

function resizeCanvas() {
  const wrapper = document.getElementById("canvas-wrapper"); // ✅ Corrected ID
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  grid.width = canvas.width;
  grid.height = canvas.height;
  grid.render();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // ✅ Initial draw
