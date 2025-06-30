import { Grid } from './classes/Grid.js';
import { CommandManager } from './classes/CommandManager.js';

const canvas = document.getElementById('excelCanvas');
const ctx = canvas.getContext('2d');

const grid = new Grid(ctx, 0, 0);
grid.commandManager = new CommandManager();

const formulaBar = document.getElementById('formula-bar');

// Update formula bar when cell is selected or range changes
function updateFormulaBar() {
  if (grid.selection.activeCell) {
    const range = grid.selection.getRange();
    if (range && (range.startRow !== range.endRow || range.startCol !== range.endCol)) {
      // Multi-cell: show top-left cell value
      formulaBar.value = grid.data[`${range.startRow},${range.startCol}`] || '';
      formulaBar.disabled = false;
    } else {
      const { row, col } = grid.selection.activeCell;
      formulaBar.value = grid.data[`${row},${col}`] || '';
      formulaBar.disabled = false;
    }
  } else {
    formulaBar.value = '';
    formulaBar.disabled = true;
  }
}

// Listen for cell selection changes
const origSelectAndFocus = grid._selectAndFocus.bind(grid);
grid._selectAndFocus = function(row, col) {
  origSelectAndFocus(row, col);
  updateFormulaBar();
};

// Listen for formula bar edits
formulaBar.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    commitFormulaBar();
  }
});
formulaBar.addEventListener('blur', commitFormulaBar);

function commitFormulaBar() {
  if (!grid.selection.activeCell) return;
  const { row, col } = grid.selection.activeCell;
  const oldValue = grid.data[`${row},${col}`] || '';
  const newValue = formulaBar.value;
  if (oldValue !== newValue) {
    grid.updateCell(row, col, newValue);
  }
}

// Initial state
updateFormulaBar();

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
