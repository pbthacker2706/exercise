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


// import { Grid } from './classes/Grid.js';

// const canvas = document.getElementById('excelCanvas');
// const ctx = canvas.getContext('2d');

// function resizeCanvas() {
//   const container = document.getElementById("canvas-wrapper");
//   canvas.width = container.clientWidth;
//   canvas.height = container.clientHeight;
//   if (grid) {
//     grid.width = canvas.width;
//     grid.height = canvas.height;
//     grid.render();
//   }
// }

// window.addEventListener('resize', resizeCanvas);

// const grid = new Grid(ctx, 0, 0);
// resizeCanvas();




// import { Grid } from './classes/Grid.js';
// import { CommandManager } from './classes/CommandManager.js';

// const canvas = document.getElementById("excelCanvas");
// const ctx = canvas.getContext("2d");

// const grid = new Grid(ctx, 0, 0);
// grid.commandManager = new CommandManager();

// function resizeCanvas() {
//   const wrapper = document.getElementById("canvas-wrapper");
//   canvas.width = wrapper.clientWidth;
//   canvas.height = wrapper.clientHeight;
//   grid.width = canvas.width;
//   grid.height = canvas.height;
//   grid.render();
// }

// window.addEventListener("resize", resizeCanvas);
// resizeCanvas();










import { Grid } from './classes/Grid.js';
import { CommandManager } from './classes/CommandManager.js';

const canvas = document.getElementById('excelCanvas');
const ctx = canvas.getContext('2d');

const grid = new Grid(ctx, 0, 0); // ✅ Creates the grid
grid.commandManager = new CommandManager(); // ✅ Links undo/redo

function resizeCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;

  grid.width = canvas.width;
  grid.height = canvas.height;
  grid.render(); // ✅ This is what draws the grid
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // ✅ Initial draw
