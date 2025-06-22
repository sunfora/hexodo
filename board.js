"use strict" 
const board_id = window.appConfig.board.board_id;
const user_name = window.appConfig.user_id;

const remove_button = document.getElementById('remove-button');
const canvas = document.getElementById('hex-grid');
const cam_debug = document.getElementById('cam-debug');
const ctx = canvas.getContext('2d');

/**
 * Usage: for tracking down the visible part of the world.
 */
class Camera {
  /**
   * Is camera moved by user?
   */
  isDragged = false;

  /**
   * Coordinate transform object.
   * Usage: for mouse dragging events / zoom and panning animations.
   */
  transform = {
    x: 0,
    y: 0,
    z: 0
  }
  
  /**
   * Current camera position (the center of the lens).
   * Usage: for altering the base position of the camera.
   */
  position = {
    x: 0,
    y: 0,
    z: 0
  }

  /**
   * X coordinate for the center of the camera lens.
   *
   * On `get` it returns the position with transform (as you might expect).
   * On `set` it however could go 2 ways: keep the transform or keep the position intact.
   *
   * I keep the transform and alter the position.
   * 
   * Why? Because the transform is primarily for effects and slight variations.
   * Whereas I believe when you want to set coordinate, you do that to position the camera.
   * If you want to change effect and transform - use transform object directly.
   * 
   * @type {number}
   */
  get x() {
    return this.position.x + this.transform.x;
  }
  set x(value) {
    this.position.x = value - this.transform.x;
  }

  /**
   * Y coordinate for the center of the camera lens.
   *
   * On `get` it returns the position with transform (as you might expect).
   * On `set` it however could go 2 ways: keep the transform or keep the position intact.
   *
   * I keep the transform and alter the position.
   * 
   * Why? Because the transform is primarily for effects and slight variations.
   * Whereas I believe when you want to set coordinate, you do that to position the camera.
   * If you want to change effect and transform - use transform object directly.
   * 
   * @type {number}
   */
  get y() {
    return this.position.y + this.transform.y;
  }
  set y(value) {
    this.position.y = value - this.transform.y;
  }

  /**
   * Z coordinate for center of the camera lens.
   *
   * On `get` it returns the position with transform (as you might expect).
   * On `set` it however could go 2 ways: keep the transform or keep the position intact.
   *
   * I keep the transform and alter the position.
   * 
   * Why? Because the transform is primarily for effects and slight variations.
   * Whereas I believe when you want to set coordinate, you do that to position the camera.
   * If you want to change effect and transform - use transform object directly.
   *
   * BY THE WAY: 
   *  why even have Z coordinate on 2d map?
   *  the reason for that is that I want to use 3d transforms in future
   *  and kind of orthographic simple pseudo 3d for cells also
   * 
   * @type {number}
   */
  get z() {
    return this.position.z + this.transform.z;
  }
  set z(value) {
    this.position.z = value - this.transform.z;
  }

  /**
   * Horizontal field of view (angle of camera)
   * Usage: to alter the visible part of the world and draw at correct aspect ratio.
   * @type {number}
   */
  fovX = 1;
  
  /**
   * The width of camera lens (synonym for `fovX`) 
   * Since distance from the observer to camera lens is always 1 (for the sake of simplicity)
   */
  get width() {
    return this.fovX;
  }
  set width(value) {
    this.fovX = value;
  }

  /**
   * Vertical field of view.
   * Usage: to alter the visible part of the world and draw at correct aspect ratio.
   * @type {number}
   */
  fovY = 1;

  /**
   * The height of camera lens (synonym for `fovY`) 
   * Since distance from the observer to camera lens is always 1 (for the sake of simplicity)
   */
  get height() {
    return this.fovY;
  }
  set height(value) {
    this.fovY = value;
  }

  /**
   * Sets position to position with transform, resets transform to zero.
   * Usage: when animation / drag is done.
   */
  applyTransform() {
    this.position = {
      x: this.position.x + this.transform.x,
      y: this.position.y + this.transform.y,
      z: this.position.z + this.transform.z
    };
    this.transform = {
      x: 0,
      y: 0,
      z: 0 
    };
  }

  /**
   * Aspect ratio of camera (alters width and height of the lens).
   * Currently when you set it, the sizes are determined via crop of the square of the biggest size.
   */
  get aspectRatio() {
    return this.width / this.height;
  }
  set aspectRatio(value) {
    const width  = this.width;
    const height = this.height;
    if (value > 1) {
      this.width = Math.max(width, height);
      this.height = Math.max(width, height) / value;
    } else {
      this.width = Math.max(width, height) * value;
      this.height = Math.max(width, height);
    }
  }

  visiblePlane(z = 0) {
    const z_height = 1 + this.z - z;
    return {
      width: z_height * this.fovX, 
      height: z_height * this.fovY
    }
  }
}

let size = 30

let underCursor = {
  row : 0,
  col : 0,
  time: 0
}

let selected = {
  row : 0,
  col : 0,
}

function update_form(header_message) {
  let title = document.querySelector('#task-title');
  let description = document.querySelector('#task-description');
  let header = document.querySelector('#task-form-header');
  title.value = selected.title;
  description.value = selected.description;
  header.textContent = header_message;
}

let camera = {
  x: 0,
  y: 0,
  savedX: 0,
  savedY: 0,
  pageX: 0,
  pageY: 0,
  moving: false
};

cam_debug.textContent = `cam(${camera.x}, ${camera.y})`;

const task_form = document.getElementById('task-form');
const task_title = document.getElementById('task-title');
const task_description = document.getElementById('task-description');

remove_button.addEventListener('click', async function () {
  try {
    const response = await fetch(`api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      console.log("deleted");
      let coords = chunk_coords(selected);
      delete chunk.get(`${coords.col}, ${coords.row}`).data[`${selected.col}, ${selected.row}`];
    }
  } catch (error) {
    console.log('During delete: ', error);
  }
});

task_form.addEventListener('submit', async function(event) {
  event.preventDefault(); // Crucial: Stop the browser's default form submission (page reload)

  const formData = new URLSearchParams();

  formData.append('task_description', task_description.value);
  formData.append('task_title', task_title.value);
  formData.append('task_id', selected.id);
  formData.append('task_completed', selected.completed);
  formData.append('user_id', user_name); 

  try {
      const response = await fetch(`/api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`, {
          method: 'POST', 
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString()
      });

      // PHP will still likely respond with JSON, so parse it
      console.log(response)
      const data = await response.json();
      if (response.ok) {
        selected.title = data.task_title;
        selected.id = data.task_id;
        selected.description = data.task_description;
        selected.completed = data.task_completed;
        update_form(`Edit task ${selected.id}`);
        let coords = chunk_coords(selected);
        chunk.get(`${coords.col}, ${coords.row}`).data[`${selected.col}, ${selected.row}`] = selected.id
      }
  } catch (error) {
      console.error('Fetch error:', error);
  }
});

canvas.addEventListener('mousedown', (event) => {
  if (event.target === event.currentTarget) {
    camera.moving = true
    camera.pageX = event.pageX;
    camera.pageY = event.pageY;
    camera.savedX = camera.x;
    camera.savedY = camera.y;
  }
});

canvas.addEventListener('mousemove', (event) => {
  if (camera.moving) {
    camera.x = camera.savedX +  (camera.pageX - event.pageX) / size
    camera.y = camera.savedY +  (camera.pageY - event.pageY) / size
    
    cam_debug.textContent = `cam(${camera.x}, ${camera.y})`;
  }
  let {x: canvas_x, y: canvas_y} = canvas.getBoundingClientRect();
  let global_x = camera.x - (canvas_x - event.clientX + canvas.width / 2) / size
  let global_y = camera.y - (canvas_y - event.clientY + canvas.height / 2) / size
  let hex = cube_to_oddq(cube_round(pixToHex(global_x, global_y)))
  if (!(hex.col === underCursor.col && hex.row === underCursor.row)) {
    underCursor.row = hex.row
    underCursor.col = hex.col
    underCursor.time = Date.now()
  }
});


const retrieve_current = (event) => {
  let task_viewer = document.querySelector('.task-viewer');

  selected.row = underCursor.row
  selected.col = underCursor.col

  fetch(`api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`)
    .then(response => {
      // Check if the request was successful (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Parse the JSON response
      return response.json();
    })
    .then( (data) => {
      // Work with the data
      if (data === null) {
        selected.id = null;
        selected.title = 'New task';
        selected.description = 'description';
        selected.completed = false;
        update_form('Create task');
      } else {
        selected.title = data.task_title;
        selected.id = data.task_id;
        selected.description = data.task_description;
        selected.completed = data.task_completed;
        update_form(`Edit task: ${selected.id}`);
      }
    })
    .catch(error => {
      // Handle any errors that occurred during the fetch
      console.error('There was a problem with the fetch operation:', error);
    });
};
canvas.addEventListener('dblclick', retrieve_current);

document.addEventListener('mouseup', (event) => {
  if (camera.moving) {
    camera.moving= false;
    camera.x = camera.savedX +  (camera.pageX - event.pageX) / size
    camera.y = camera.savedY +  (camera.pageY - event.pageY) / size
  }
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  size += event.wheelDelta / 100
});


function cube_round(hex) {
  let q_i = Math.round(hex.q);
  let r_i = Math.round(hex.r);
  let s_i = Math.round(hex.s);

  let q_diff = Math.abs(q_i - hex.q);
  let r_diff = Math.abs(r_i - hex.r);
  let s_diff = Math.abs(s_i - hex.s);

  if (q_diff > r_diff && q_diff > s_diff) {
    q_i = -(r_i + s_i);
  } else if (r_diff > s_diff) {
    r_i = -(q_i + s_i);
  } else {
    s_i = -(q_i + r_i);
  }

  return {q: q_i, r: r_i, s: s_i};
}

function pixToHex(x, y) {
  let q = 2 * x / 3;
  let r = -1./3 * x + Math.sqrt(3) / 3 * y;

  return {q: q, r: r, s: -(q + r)};
}



function cube_to_oddq(hex) {
  let col = hex.q;
  let row = hex.r + (hex.q - (hex.q&1)) / 2;
  return {col: col, row: row};
}

function oddq_to_cube(hex) {
  let q = hex.col;
  let r = hex.row - (hex.col - (hex.col&1)) / 2;
  return {q: q, r: r, s: -(q + r)}
}

function hexToPix(hex) {
  // hex to cartesian
  let x = (     3./2 * hex.q                    )
  let y = (Math.sqrt(3)/2 * hex.q  +  Math.sqrt(3) * hex.r)
  // scale cartesian coordinates
  x = x 
  y = y
  return {x: x, y: y};
}

let chunk = new Map();

function chunk_coords(hex) {
  return {
    col : (hex.col - ((hex.col % 10 + 10) % 10)) / 10,
    row : (hex.row - ((hex.row % 10 + 10) % 10)) / 10
  };
}

let requests_made = 0;
let global_timeout = 0;

function from_chunk(hex) {
  let pos = chunk_coords(hex);
  let key = `${pos.col}, ${pos.row}`;
  if (chunk.has(key) && chunk.get(key).loaded) {
    return chunk.get(key).data[`${hex.col}, ${hex.row}`];
  } else if (requests_made > 4 || Date.now() < global_timeout) {
    return null;
  } else if (chunk.has(key) && Date.now() < chunk.get(key).timeout) {
    return null; 
  } else {
    global_timeout = Date.now() + 100
    chunk.set(key, {
      loaded: false,
      timeout: Date.now() + 10000,
      data: null
    });
    requests_made += 1;
    fetch(`api/boards/${board_id}/chunks?col=${pos.col}&row=${pos.row}`).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    }).then((data) => {
      let result = {}
      for (const point of data) {
        result[`${point.cell_col}, ${point.cell_row}`] = point.task_id
      }
      chunk.get(key).data = result
      console.log(result);
      chunk.get(key).loaded = true;
      requests_made -= 1;
    }).catch( (error) => {
      console.log(error);
      requests_made -= 1;
    })
    return null;
  }
}

function drawGrid() {
  let corner_x = camera.x - ((canvas.width / 2) / size);
  let corner_y = camera.y - ((canvas.height/ 2) / size);

  let cube = cube_round(pixToHex(corner_x, corner_y));
  let hex = cube_to_oddq(cube);
   
  const pos = () => {
    let global = hexToPix(oddq_to_cube(hex));
    return {x: (global.x - corner_x) * size,
            y: (global.y - corner_y) * size}
  }

  // search corner outside of viewport
  while (pos().y + 2 * size > 0 || pos().x + 2 * size > 0) {
    hex.row -= 1;
    hex.col -= 1;
  }

  const HIGHLIGHT_DURATION = 200;
  const START_COLOR = { r: 255, g: 255, b: 255}; // White
  const END_COLOR = { r: 255, g: 215, b: 0 };     // Gold (FFD700) - standard gold
  const FLICKERING_COLOR_START = { r: 154, g: 205, b: 50 };     // Gold (FFD700) - standard gold
  const FLICKERING_COLOR_END = { r: 154, g: 155, b: 50 }; 

  // Function to linearly interpolate between two values
  function lerp(start, end, t) {
    return start + t * (end - start);
  }
  cam_debug.textContent = `cam(${camera.x} ${camera.y}) ;${hex.col} ${hex.row}`;
  for (; pos().y - 2 * size < canvas.height; hex.row += 1) {
    let col_start = hex.col
    for (; pos().x - 2 * size < canvas.width; hex.col += 1) {
      ctx.translate(pos().x, pos().y)
      let value = from_chunk(hex);
      if (hex.row === underCursor.row && hex.col === underCursor.col) {
        let nt = Math.min(Date.now() - underCursor.time, HIGHLIGHT_DURATION) / HIGHLIGHT_DURATION;
        const r = Math.round(lerp(START_COLOR.r, END_COLOR.r, nt));
        const g = Math.round(lerp(START_COLOR.g, END_COLOR.g, nt));
        const b = Math.round(lerp(START_COLOR.b, END_COLOR.b, nt));
        drawHexagon(`${hex.col} ${hex.row}`, `rgb(${r}, ${g}, ${b})`)
      } else if (hex.row === selected.row && hex.col === selected.col) {
        let nt = Math.abs(Math.sin(Date.now() / 500));
        const r = Math.round(lerp(FLICKERING_COLOR_START.r, FLICKERING_COLOR_END.r, nt));
        const g = Math.round(lerp(FLICKERING_COLOR_START.g, FLICKERING_COLOR_END.g, nt));
        const b = Math.round(lerp(FLICKERING_COLOR_START.b, FLICKERING_COLOR_END.b, nt));
        drawHexagon(`${hex.col} ${hex.row}`, `rgb(${r}, ${g}, ${b})`)
      } else if (value) {
        drawHexagon(`${hex.col} ${hex.row}`, 'orange')
      } else if (value !== null) {
        drawHexagon(`${hex.col} ${hex.row}`)
      } else {
        drawHexagon(`${hex.col} ${hex.row}`, 'grey')
      }
      ctx.translate(-pos().x, -pos().y);
    }
    hex.col = col_start;
  }
}

function drawHexagon(text="lol", style='transparent') {
  ctx.save()

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 0.25;
  ctx.fillStyle = style;
  let turns = 6;
  let angle = 2 * Math.PI / turns;
  ctx.translate(-size * Math.cos(angle), -size * Math.sin(angle));
  ctx.beginPath()
  for (let i = 0; i < 6; i += 1) {
    ctx.lineTo(size, 0);
    ctx.translate(size, 0);
    ctx.rotate(angle);
  }
  ctx.closePath();
  ctx.translate(size * Math.cos(angle), size * Math.sin(angle));
  ctx.stroke();
  ctx.fill();
  ctx.font = `${size / 3}px Arial`; // Adjust font size as needed to fit the circle
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center'; // Center the text horizontally
  ctx.textBaseline = 'middle'; // Center the text vertically
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawAnimationFrame() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
}
let canvasFrame = null;
function loop() {
  if (canvasFrame) {
    cancelAnimationFrame(canvasFrame);
  }
  drawAnimationFrame();
  canvasFrame = requestAnimationFrame(loop);
}

// wire up 
retrieve_current();
requestAnimationFrame(loop);
