// import { Grid } from './classes/Grid.js';
// import { CommandManager } from './classes/CommandManager.js';

// const canvas = document.getElementById('excelCanvas');
// const ctx = canvas.getContext('2d');

// let grid;


// function resizeCanvas() {
//   canvas.width = window.innerWidth;
//   canvas.height = window.innerHeight - 30;
//   if (grid) {
//     grid.width = canvas.width;
//     grid.height = canvas.height;
//     grid.render();
//   }
// }

// window.addEventListener('resize', resizeCanvas);

// grid = new Grid(ctx, window.innerWidth, window.innerHeight - 30);
// grid.commandManager = new CommandManager();
// resizeCanvas();








import { Grid } from './classes/Grid.js';
import { CommandManager } from './classes/CommandManager.js';

const canvas = document.getElementById('excelCanvas');
const ctx = canvas.getContext('2d');

const grid = new Grid(ctx, 0, 0); // ✅ Creates the grid
grid.commandManager = new CommandManager(); // ✅ Links undo/redo

function resizeCanvas() {
  const canvas = document.getElementById("excelCanvas");
  const wrapper = document.getElementById("canvas-container");
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  grid.width = canvas.width;
  grid.height = canvas.height;
  grid.render();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // initial call


window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // ✅ Initial draw
