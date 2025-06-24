"use strict" 
const board_id = window.appConfig.board.board_id;
const user_name = window.appConfig.user_id;

const list_view = document.getElementById('list-view');

const active_section = document.getElementById('active-section');
const toggle_list_view = document.getElementById('toggle-list-view');

const active_list = document.getElementById('active-list');
const done_list = document.getElementById('done-list');
const locked_list = document.getElementById('locked-list');

const task_form = document.getElementById('task-form');
const task_title = document.getElementById('task-title');
const task_description = document.getElementById('task-description');

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

let done = [];
let locked = [];
let active = [];

/**
 * @param {array} new_array - update with
 */
function array_changed(old_array, new_array) {
  if (new_array.length !== old_array.length) {
    return true;
  }
  for (const old_elem of old_array) {
    let has = false;
    for (const new_elem of new_array) {
      if (
        new_elem.title === old_elem.title 
     && new_elem.col === old_elem.col
     && new_elem.row === old_elem.row 
      ) {
        has = true;
        break;
      }
    }
    if (!has) {
      return true;
    }
  }
  return false;
}

function toggle_list_with_editor() {
  if (list_view.hasAttribute('hidden')) {
    task_form.setAttribute('hidden', '');
    list_view.removeAttribute('hidden');
    toggle_list_view.textContent = 'edit selected';
    requestAnimationFrame(() => {
      let t = list_view.querySelector(`[data-col="${selected.col}"][data-row="${selected.row}"]`);
      if (t) {
        t.classList.add('selected');
        t.scrollIntoView();
      }
    });
  } else {
    task_form.removeAttribute('hidden');
    list_view.setAttribute('hidden', '');
    toggle_list_view.textContent = 'list view';
  }
}

toggle_list_view.addEventListener('click', toggle_list_with_editor);

list_view.addEventListener('click', (event) => {
  if (event.target.tagName === 'LI') {
    let col = parseInt(event.target.getAttribute('data-col'));
    let row = parseInt(event.target.getAttribute('data-row'));
    let hex = {col: col, row: row};
    let pos = hex_to_pix(oddq_to_cube(hex));
    camera.x = pos.x;
    camera.y = pos.y;
    retrieve_current(null, hex);
  }
});

function update_list(elem_list, old_list, new_list) {
  if (array_changed(old_list, new_list)) {
    elem_list.textContent = ""; 
    for (const elem of new_list) {
      const listItem = document.createElement('li');
      listItem.textContent = elem.title; 
      listItem.setAttribute('data-col', elem.col);
      listItem.setAttribute('data-row', elem.row);
      elem_list.appendChild(listItem);
    }
    return true;
  }
  return false;
}

function update_lists(new_active, new_done, new_locked) {
  if (list_view.hasAttribute('hidden')) {
    return;
  }
  if (update_list(active_list, active, new_active)) {
    active = new_active;
  }
  if (update_list(done_list, done, new_done)) {
    done = new_done;
  }
  if (update_list(locked_list, locked, new_locked)) {
    locked = new_locked;
  }

  let t = list_view.querySelector(`[data-col="${selected.col}"][data-row="${selected.row}"]`);
  if (t) {
    t.classList.add('selected');
  }
}

function update_active_list(new_list) {
  if (array_changed(active, new_list)) {
    active_list.textContent = "";
  }
}

let size = 30

let under_cursor = {
  row : 0,
  col : 0,
  time: 0
}

let selected = {
  row : 0,
  col : 0,
}

const title = document.querySelector('#task-title');
const description = document.querySelector('#task-description');
const header = document.querySelector('#task-form-header');
const completed = document.querySelector('#task-completed');

function update_form(header_message) {
  title.value = selected.title;
  description.value = selected.description;
  description.value = selected.description;
  completed.checked = selected.completed;
  header.textContent = header_message;
}

function update_selected() {
  selected.title = title.value;
  selected.description = description.value;
  selected.completed = completed.checked;
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


remove_button.addEventListener('click', async function () {
  try {
    const response = await fetch(`api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      console.log("deleted");
      let coords = chunk_coords(selected);
      delete chunk.get(`${coords.col}, ${coords.row}`).data[`${selected.col}, ${selected.row}`];
      form_new_task();
    }
  } catch (error) {
    console.log('During delete: ', error);
  }
});

task_form.addEventListener('change', update_selected);

task_form.addEventListener('submit', async function(event) {
  event.preventDefault(); // Crucial: Stop the browser's default form submission (page reload)

  const form_data = new URLSearchParams();

  form_data.append('task_description', selected.description);
  form_data.append('task_title', selected.title);
  form_data.append('task_id', selected.id);
  form_data.append('task_completed', selected.completed);
  form_data.append('user_id', user_name); 

  try {
      const response = await fetch(`/api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`, {
          method: 'POST', 
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form_data.toString()
      });

      // PHP will still likely respond with JSON, so parse it
      console.log(response)
      const data = await response.json();
      if (response.ok) {
        update_form_with_new_data(data);
        let coords = chunk_coords(selected);
        chunk.get(`${coords.col}, ${coords.row}`).data[`${selected.col}, ${selected.row}`] = {
          'id': selected.id,
          'completed': selected.completed
        }
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
  if (!(hex.col === under_cursor.col && hex.row === under_cursor.row)) {
    under_cursor.row = hex.row
    under_cursor.col = hex.col
    under_cursor.time = Date.now()
  }
});

function stub_task() {
  return {
    'id': null,
    'title': 'New task',
    'description': 'description',
    'completed': false
  };
}

function form_new_task() {
  copy_task_to(stub_task(), selected);
  update_form('Create task');
}

function copy_task_to(src, dest) {
  dest.title       = src.title;
  dest.id          = src.id;
  dest.description = src.description;
  dest.completed   = src.completed;
}

function form_edit_task(task) {
  copy_task_to(task, selected);
  update_form(`Edit task: ${selected.id}`);
}

function update_form_with_new_data(backend_data) {
  if (backend_data === null) {
    form_new_task();
  } else {
    form_edit_task({
      'title':       backend_data.task_title,
      'id':          backend_data.task_id,
      'description': backend_data.task_description,
      'completed':   backend_data.task_completed
    });
  }
}

const retrieve_current = (event, current = under_cursor) => {
  let t = list_view.querySelector(`[data-col="${selected.col}"][data-row="${selected.row}"]`)
  if (t) {
    t.classList.remove('selected');
  }
  selected.row = current.row
  selected.col = current.col
  selected.time = Date.now();

  fetch(`api/boards/${board_id}/cells?row=${selected.row}&col=${selected.col}`)
    .then(response => {
      // Check if the request was successful (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Parse the JSON response
      return response.json();
    })
    .then(update_form_with_new_data)
    .then(() => {
      t = list_view.querySelector(`[data-col="${selected.col}"][data-row="${selected.row}"]`);
      if (t) {
        t.classList.add('selected');
        t.scrollIntoView();
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

function hex_to_pix(hex) {
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
        result[`${point.cell_col}, ${point.cell_row}`] = {
          'id': point.task_id,
          'completed': point.task_completed,
          'title': point.task_title,
          'col': point.cell_col,
          'row': point.cell_row
        }
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

function draw_grid() {
  let corner_x = camera.x - ((canvas.width / 2) / size);
  let corner_y = camera.y - ((canvas.height/ 2) / size);

  let cube = cube_round(pixToHex(corner_x, corner_y));
  let hex = cube_to_oddq(cube);
   
  const pos = () => {
    let global = hex_to_pix(oddq_to_cube(hex));
    return {x: (global.x - corner_x) * size,
            y: (global.y - corner_y) * size}
  }

  // search corner outside of viewport
  while (pos().y + 2 * size > 0 || pos().x + 2 * size > 0) {
    hex.row -= 1;
    hex.col -= 1;
  }
  
  const EMPTY    = { r: 255, g: 255, b: 255 }; // white
  const SELECTED = { r: 255, g: 215, b: 0   }; // gold
  const DONE     = { r: 176, g: 196, b: 182 }; // #B0C4B6
  const TODO     = { r: 255, g: 165, b: 0   }; // orange
  const LOCKED   = { r: 175, g: 157, b: 154 }; // #AF9D9A
  const LOADING  = { r: 128, g: 128, b: 128 }; // grey

  const HIGHLIGHT_DURATION = 200;

  // Function to linearly interpolate between two values
  function lerp(start, end, t) {
    return start + t * (end - start);
  }

  function lerp_color(start, end, t) {
    const r = Math.round(lerp(start.r, end.r, t));
    const g = Math.round(lerp(start.g, end.g, t));
    const b = Math.round(lerp(start.b, end.b, t));
    return {r, g, b};
  }

  function color_to_style(color) {
    return `rgb(${color.r}, ${color.g}, ${color.b}`;
  }

  cam_debug.textContent = `cam(${camera.x} ${camera.y}) ;${hex.col} ${hex.row}`;

  let new_active = [];
  let new_done = [];
  let new_locked = [];

  for (; pos().y - 2 * size < canvas.height; hex.row += 1) {
    let col_start = hex.col
    for (; pos().x - 2 * size < canvas.width; hex.col += 1) {
      ctx.translate(pos().x, pos().y)

      let value = from_chunk(hex);
      let below, left, right;

      if (hex.col & 1) {
        below = from_chunk({'col': hex.col, 'row': hex.row + 1});
        left  = from_chunk({'col': hex.col - 1, 'row': hex.row + 1});
        right = from_chunk({'col': hex.col + 1, 'row': hex.row + 1});
      } else {
        below = from_chunk({'col': hex.col, 'row': hex.row + 1});
        left  = from_chunk({'col': hex.col - 1, 'row': hex.row});
        right = from_chunk({'col': hex.col + 1, 'row': hex.row});
      }

      let calculated_color;

      let all_loaded = value !== null
                    && below !== null
                    && left  !== null
                    && right !== null;

      if (all_loaded) {
        let unlocked = (below === undefined  || below.completed)
                    && (left  === undefined  || left.completed )
                    && (right === undefined  || right.completed);
        if (value === undefined) {
          calculated_color = EMPTY;
        } else if (value.completed) {
          calculated_color = DONE;
          new_done.push(value);
        } else if (unlocked) {
          calculated_color = TODO;
          new_active.push(value);
        } else {
          calculated_color = LOCKED;
          new_locked.push(value);
        }
      } else {
        calculated_color = LOADING;
      }
      
      if (hex.row === under_cursor.row && hex.col === under_cursor.col) {
        let nt = Math.min(Date.now() - under_cursor.time, HIGHLIGHT_DURATION) / HIGHLIGHT_DURATION;
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      } else if (hex.row === selected.row && hex.col === selected.col) {
        let nt = Math.abs(Math.sin(Date.now() / 500));
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      }         
      draw_hexagon(`${hex.col} ${hex.row}`, color_to_style(calculated_color));
      ctx.translate(-pos().x, -pos().y);
    }
    hex.col = col_start;
  }
  update_lists(new_active, new_done, new_locked);
}

function draw_hexagon(text="lol", style='transparent') {
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

function draw_animation_frame() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw_grid();
}
let canvasFrame = null;
function loop() {
  if (canvasFrame) {
    cancelAnimationFrame(canvasFrame);
  }
  draw_animation_frame();
  canvasFrame = requestAnimationFrame(loop);
}

// wire up 
retrieve_current();
requestAnimationFrame(loop);
