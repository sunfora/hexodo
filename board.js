import {
  oddq_to_cube, 
  cube_to_oddq, 
  cube_round,
  vec2_to_cube,
  cube_to_vec2,
  xy_to_cube,
  xy_nearest_oddq,
  oddq_to_vec2,
  HexCube, 
  HexOddQ,
  Vec2
} from "./coords.js";

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

const title = document.querySelector('#task-title');
const description = document.querySelector('#task-description');
const header = document.querySelector('#task-form-header');
const completed = document.querySelector('#task-completed');


/**
 * struct Vec3(x: number, y: number, z: number)
 */
class Vec3 {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /** 
   * Reuse the Vec3.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {Vec3} target 
   * 
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  static rec(target, x, y, z) {
    target.x = x;
    target.y = y;
    target.z = z;
    return target;
  }

  /** 
   * Reuse the Vec3 or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?Vec3} target 
   *
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  static recOrNew(target, x, y, z) {
    return target instanceof Vec3
      ? Vec3.rec(target, x, y, z)
      : new Vec3(x, y, z);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?Vec3} first
   * @param {?Vec3} second 
   *
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  static equals(first, second) {
    return first  instanceof Vec3 &&
           second instanceof Vec3 &&
           first.x === second.x &&
           first.y === second.y &&
           first.z === second.z
  }

  /** 
   * Compares two Vec3 structs.
   * @param {Vec3} other 
   */
  equals(other) {
    return other instanceof Vec3 &&
           this.x === other.x &&
           this.y === other.y &&
           this.z === other.z;
  }

  /** 
   * Clones Vec3.
   */
  clone() {
    const x = this.x;
    const y = this.y;
    const z = this.z
    return new Vec3(x, y, z);
  }

  /** 
   * Copies contents of this Vec3 to other
   * @param {Vec3} other
   */
  copyTo(other) {
    const x = this.x;
    const y = this.y;
    const z = this.z
    return Vec3.rec(other, x, y, z);
  }
}

/**
 * Usage: for tracking down the visible part of the world.
 */
class Camera {
  #DEFAULT_TRANSFORM = new Vec3(0, 0, 0);
  #DEFAULT_POSITION  = new Vec3(0, 0, 0);

  /**
   * Is camera moved by user?
   */
  isDragged = false;

  /**
   * Coordinate transform object.
   * Usage: for mouse dragging events / zoom and panning animations.
   */
  transform = this.#DEFAULT_TRANSFORM;
  
  /**
   * Current camera position (the center of the lens).
   * Usage: for altering the base position of the camera.
   */
  position = this.#DEFAULT_POSITION;

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
   * The width of camera lens (synonym for `fovX * 2`) 
   * Since distance from the observer to camera lens is always 1 (for the sake of simplicity)
   */
  get width() {
    return this.fovX * 2;
  }
  set width(value) {
    this.fovX = value / 2;
  }

  /**
   * Vertical field of view.
   * Usage: to alter the visible part of the world and draw at correct aspect ratio.
   * @type {number}
   */
  fovY = 1;

  /**
   * The height of camera lens (synonym for `fovY * 2`) 
   * Since distance from the observer to camera lens is always 1 (for the sake of simplicity)
   */
  get height() {
    return this.fovY * 2;
  }
  set height(value) {
    this.fovY = value / 2;
  }

  /**
   * The scale of unit circle radius at (0, 0) with radius = 1 at plane with z = 0, projected on camera lens.
   */
  get z0UnitScale() {
    return 1/(this.z + 1);
  }
  set z0UnitScale(value) {
    this.z = 1/value - 1;
  }

  /**
   * Set scale of unit circle on plane with specified z.
   * @param {number} value - new scale
   * @param {number} z - depth
   */
  setUnitScale(value, z=0) {
    this.z = 1/value - 1 + z;
  }

  /**
   * Get scale of unit circle on plane with specified z.
   * @param {number} z - depth
   */
  getUnitScale(z=0) {
    return 1/(this.z + 1 - z);
  }

  /**
   * Sets position to position with transform, resets transform to zero.
   * Usage: when animation / drag is done.
   */
  applyTransform() {
    const x = this.position.x + this.transform.x;
    const y = this.position.y + this.transform.y;
    const z = this.position.z + this.transform.z;
    this.position = Vec3.rec(this.position, x, y, z);
    this.transform = Vec3.rec(this.#DEFAULT_TRANSFORM, 0, 0, 0);
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
  /**
   * @param {number=} z - plane height
   * @param {?BoundingBox} dest - reuse
   * @returns {BoundingBox} visible plane in logical coordinates
   */
  visiblePlane(z = 0, dest=null) {
    const z_height = 1 + this.z - z;
    const width =  z_height * this.width;
    const height = z_height * this.height;
    const minX = this.x - width / 2;
    const maxX = this.x + width / 2;
    const minY = this.y - height / 2;
    const maxY = this.y + height / 2;
    return BoundingBox.recOrNew(dest, minX, maxX, minY, maxY);
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
    return 'list-view';
  } else {
    task_form.removeAttribute('hidden');
    list_view.setAttribute('hidden', '');
    toggle_list_view.textContent = 'list view';
    return 'editor';
  }
}

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
}

function update_active_list(new_list) {
  if (array_changed(active, new_list)) {
    active_list.textContent = "";
  }
}

let under_cursor = {
  hex: new HexOddQ(0, 0),
  time: 0
}

let selected = {
  hex: new HexOddQ(0, 0),
}

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

let camera = new Camera();

async function request_cell_remove(which) {
  const response = await fetch(`api/boards/${board_id}/cells?row=${which.row}&col=${which.col}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

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

function task_from_backend(backend_data) {
  return {
    'title':       backend_data.task_title,
    'id':          backend_data.task_id,
    'description': backend_data.task_description,
    'completed':   backend_data.task_completed
  };
}

function update_form_with_new_task(task) {
  if (task === null) {
    form_new_task();
  } else {
    form_edit_task(task);
  }
  
}

function update_form_with_new_data(backend_data) {
  if (backend_data === null) {
    form_new_task();
  } else {
    form_edit_task(task_from_backend(backend_data));
  }
}

async function request_hex(hex) {
  try {
    let response = await fetch(`api/boards/${board_id}/cells?row=${hex.row}&col=${hex.col}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    let data = await response.json();
    return data === null? null : task_from_backend(data);
  } catch (error) {
    console.log('during request_hex: ', error);
  }
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

/**
 * struct Chunk(col: number, row: number)
 */
class Chunk {

  /**
   * The size of the chunk in terms of size x size of hexes
   * So currently 16 x 16 = 256
   *
   * TODO(ivan): lock this down 
   */
  static SIZE = 16;

  /**
   * @param {number} col
   * @param {number} row
   */
  constructor(col, row) {
    this.row = row;
    this.col = col;
  }

  /** 
   * Reuse the Chunk.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {Chunk} target 
   * 
   * @param {number} col
   * @param {number} row
   */
  static rec(target, col, row) {
    target.row = row;
    target.col = col;
    return target;
  }

  /** 
   * Reuse the Chunk or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?Chunk} target 
   *
   * @param {number} col
   * @param {number} row
   */
  static recOrNew(target, col, row) {
    return target instanceof Chunk
      ? Chunk.rec(target, col, row)
      : new Chunk(col, row);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?Chunk} first
   * @param {?Chunk} second 
   *
   * @param {number} row
   * @param {number} col
   */
  static equals(first, second) {
    return first  instanceof Chunk &&
           second instanceof Chunk &&
           first.row === second.row &&
           first.col === second.col
  }

  /** 
   * Compares two Chunk structs.
   * @param {Chunk} other 
   */
  equals(other) {
    return other instanceof Chunk &&
           this.row === other.row &&
           this.col === other.col;
  }

  /** 
   * Clones Chunk.
   */
  clone() {
    const row = this.row;
    const col = this.col
    return new Chunk(col, row);
  }

  /** 
   * Copies contents of this Chunk to other
   * @param {Chunk} other
   */
  copyTo(other) {
    const row = this.row;
    const col = this.col
    return Chunk.rec(other, col, row);
  }

  /**
   * Min col for oddq hex (as if it was bounding box)
   */
  get minX() {
    return this.col * Chunk.SIZE;
  }

  /**
   * Max col for oddq hex (as if it was bounding box)
   */
  get maxX() {
    return (this.col + 1) * Chunk.SIZE - 1;
  }

  /**
   * Min row for oddq hex (as if it was bounding box)
   */
  get minY() {
    return this.row * Chunk.SIZE;
  }

  /**
   * Max row for oddq hex (as if it was bounding box)
   */
  get maxY() {
    return (this.row + 1) * Chunk.SIZE - 1;
  }

  /**
   * Use hex to locate chunk which contains the hex.
   *
   * @param {HexOddQ} hex - oddq coords 
   * @param {?Chunk} - reuse
   * @returns {?Chunk} - chunk which contains hex
   */
  static fromHexOddQ(hex, target=null) {
    return Chunk.fromColRow(hex.col, hex.row, target);
  }

  /**
   * Use hex to locate chunk which contains the hex.
   *
   * @param {number} col - column in oddq
   * @param {number} row - row in oddq
   * @param {?Chunk} - reuse
   * @returns {?Chunk} - chunk which contains hex
   */
  static fromColRow(col, row, target=null) {
    col = Chunk.colHexCol(col);
    row = Chunk.rowHexRow(row);
    return Chunk.recOrNew(target, col, row);
  }

  // TODO(ivan): add comment
  static colHexCol(col) {
    return Math.floor(col / Chunk.SIZE);
  }

  // TODO(ivan): add comment
  static rowHexRow(row) {
    return Math.floor(row / Chunk.SIZE);
  }
}


/**
 * struct HexInfo(
 *    status?: string = "loading", 
 *    id?: number = null,
 *    type?: string = "empty", 
 *    title?: string = null, 
 *    completed?: boolean = false, 
 *    description?: string = null
 * ) 
 */
class HexInfo {
  /**
   * @param {string=} status
   * @param {number=} id
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  constructor(status, id, type, title, completed, description) {
    this.status = status === undefined ? "loading" : status;
    this.id = id === undefined ? null : id;
    this.type = type === undefined ? "empty" : type;
    this.title = title === undefined ? null : title;
    this.completed = completed === undefined ? false : completed;
    this.description = description === undefined ? null : description;
  }

  /** 
   * Reuse the HexInfo.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {HexInfo} target 
   * 
   * @param {string=} status
   * @param {number=} id
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static rec(target, status, id, type, title, completed, description) {
    target.status = (status === undefined)? "loading" : status;
    target.id = (id === undefined)? null : id;
    target.type = (type === undefined)? "empty" : type;
    target.title = (title === undefined)? null : title;
    target.completed = (completed === undefined)? false : completed;
    target.description = (description === undefined)? null : description;
    return target;
  }

  /** 
   * Reuse the HexInfo or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?HexInfo} target 
   *
   * @param {string=} status
   * @param {number=} id
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static recOrNew(target, status, id, type, title, completed, description) {
    return target instanceof HexInfo
      ? HexInfo.rec(target, status, id, type, title, completed, description)
      : new HexInfo(status, id, type, title, completed, description);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?HexInfo} first
   * @param {?HexInfo} second 
   *
   * @param {string=} status
   * @param {number=} id
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static equals(first, second) {
    return first  instanceof HexInfo &&
           second instanceof HexInfo &&
           first.status === second.status &&
           first.id === second.id &&
           first.type === second.type &&
           first.title === second.title &&
           first.completed === second.completed &&
           first.description === second.description
  }

  /** 
   * Compares two HexInfo structs.
   * @param {HexInfo} other 
   */
  equals(other) {
    return other instanceof HexInfo &&
           this.status === other.status &&
           this.id === other.id &&
           this.type === other.type &&
           this.title === other.title &&
           this.completed === other.completed &&
           this.description === other.description;
  }

  /** 
   * Clones HexInfo.
   */
  clone() {
    const status = this.status;
    const id = this.id;
    const type = this.type;
    const title = this.title;
    const completed = this.completed;
    const description = this.description
    return new HexInfo(status, id, type, title, completed, description);
  }

  /** 
   * Copies contents of this HexInfo to other
   * @param {HexInfo} other
   */
  copyTo(other) {
    const status = this.status;
    const id = this.id;
    const type = this.type;
    const title = this.title;
    const completed = this.completed;
    const description = this.description
    return HexInfo.rec(other, status, id, type, title, completed, description);
  }
}

/**
 * Get mathematical remainder. a = r mod b, where b > r >= 0
 * @param {number} a - the number to divide
 * @param {number} m - the modulo
 * @returns {number} - remainder of division
 */
function rem(a, m) {
  return ((a % m) + m) % m;
}

/**
 * The system responsible for handling all kind of fetches from the server.
 * When it comes to hexes.
 */
class ChunkStorage {
  /**
   * unprocessed
   */
  static inbox = [];
  
  static cycles = 0;
  
  static queue = [
    {cycles: 8,   tasks: []},  // 0  lod 0 near camera
    {cycles: 16,  tasks: []},  // 1  lod 1 huge near camera
    {cycles: 32,  tasks: []},  // 2  lod 2 minimap
    {cycles: 64,  tasks: []},  // 3  individual hexes
    {cycles: 128, tasks: []}   // 4  slowly load past camera
  ];

  /**
   * Level of Details 0 (number chunks: 1x1)
   * includes: 
   *   - title 
   *   - description
   *   - completion status
   *   - block type
   */
  static LOD_0 = 1;

  /**
   * Level of Details 1 (number chunks: 4x4)
   * includes: 
   *   - title 
   *   - block type
   */
  static LOD_1 = 4;

  /**
   * Level of Details 2 (number chunks: 16x16)
   * includes: 
   *   - single low resolution texture
   *   TODO(ivan): implement on server side
   */
  static LOD_2 = 16;

  /**
   * Not more than 10 individual fetches from the user.
   */
  static MAX_TOTAL_CONCURRENT_REQUESTS = 10;

  /**
   * Client should not exceed this number of requests per session.
   * TODO(ivan): create strict serverside limit and return SERVER_IS_BUSY or something
   */
  static MAX_CHUNK_CONCURRENT_REQUESTS = 8;

  /**
   * Optimal requests to server
   */
  static OPT_CHUNK_CONCURRENT_REQUESTS = 4;

  /**
   * Client should not exceed this number of requests per session.
   * TODO(ivan): create strict serverside limit and return SERVER_IS_BUSY or something
   */
  static MAX_CELL_CONCURRENT_REQUESTS = 4;

  /**
   * Optimal requests of individual cells to the server
   */
  static OPT_CELL_CONCURRENT_REQUESUT = 2;

  static total_requests = 0;
  static cell_requests = 0;
  static chunk_requests = 0;
  
  // TODO(ivan): not finished
  static queue(event) {
    switch (event.type) {
      case 'REQUEST_ALL_CAMERA_VISIBLE':
        ChunkStorage.requestAllVisible(event.bounding_box);
        break;
      case 'CELL_REMOVE':
        break;
      case 'CELL_UPD':
        break;
    }
  }  
    
  /**
   * Request all visible hexes inside bounding box
   * @param {BoundingBox} - bounding_box 
   */
  static requestAllVisible(bounding_box) {
    const minX = bounding_box.minX - 1;
    const minY = bounding_box.minY;
    const maxX = bounding_box.maxX + 1;
    const maxY = bounding_box.maxY + 1;

    const minChunkX = Chunk.colHexCol(minX);
    const maxChunkX = Chunk.colHexCol(maxX);
    const minChunkY = Chunk.rowHexRow(minY);
    const maxChunkY = Chunk.rowHexRow(maxY);

    for (let col = minChunkX; col <= maxChunkX; ++col) {
      for (let row = minChunkY; row <= maxChunkY; ++row) {
        if (!ChunkStorage.isLoaded(col, row) && !ChunkStorage.isLoading(col, row)) {
          ChunkStorage.requestChunk(col, row)
        }
      }
    }
  }
  
  /**
   * Returns the chunk cells.
   * @param {number} col - chunk col
   * @param {number} row - chunk row
   */
  static cellsColRow(col, row) {
  }

  /**
   * Returns the chunk cells.
   * @param {number} col - chunk col
   * @param {number} row - chunk row
   */
  static cellsChunk(chunk) {
  }

  /**
   * Checks is chunk loaded?
   */
  static isLoaded(col, row) {
    const key = `${col},${row}`;
    const storage = ChunkStorage.storage;
    return storage.has(key);
  }

  /**
   * Checks is chunk loading?
   */
  static isLoading(col, row) {
    const key = `${col},${row}`;
    const loading = ChunkStorage.loading;
    return loading.has(key);
  }
  
  /**
   * Send request to the server for a chunk, write it to storage.
   * @returns {Response} - the result of operation
   */
  static async requestChunk(col, row) {
    const key = `${col},${row}`;

    const loading = ChunkStorage.loading;
    const storage = ChunkStorage.storage;

    // abort pending request to same place
    const old = loading.get(key);
    if (old !== undefined) {
      old.abort();
    }
    // set own abort switch
    const controller = new AbortController();
    const signal = controller.signal;
    loading.set(key, controller);

    try { 
      const response = await fetch(`api/boards/${board_id}/chunks?col=${col}&row=${row}`, {signal});

      if (!response.ok) {
        return response;
      }

      /** @type {Array} points */
      const points = await response.json();
      
      /**  @type {HexInfo[]} chunk */
      let chunk;
      if (!ChunkStorage.isLoaded(col, row)) {
        chunk = new Array(Chunk.SIZE * Chunk.SIZE).fill(null);
        for (let i = 0; i < chunk.length; ++i) {
          chunk[i] = new HexInfo('loaded');
        }
        storage.set(key, chunk);
      } else {
        chunk = storage.get(key);
      }

      // set them to be empty 
      chunk.forEach(info => HexInfo.rec(info, 'loaded'));
      // set values
      for (const point of points) {
        const point_col = rem(point.cell_col, Chunk.SIZE);
        const point_row = rem(point.cell_row, Chunk.SIZE);
        const point_id = point_row * Chunk.SIZE + point_col;
        chunk[point_id].type = 'task';
        chunk[point_id].id = point.task_id;
        chunk[point_id].completed = point.task_completed;
        chunk[point_id].title = point.task_title;
      }
      return response;
    } finally {
      // remove from loading, since we succeeded or have failed
      if (loading.get(key) === controller) {
        loading.delete(key);
      }
    }
  }

  static processInbox() {
  // TODO(ivan): not finished
    for (const action of ChunkStorage.inbox) {
      
    }
  }

  /**
   * Retrieves hex info from oddq coordinates.
   * @param {HexOddQ} - oddq coordinates
   * @param {?HexInfo} target - reuse 
   * @returns {HexInfo} - info on given hex
   */
  static getHexInfoOddQ(hex, target=null) {
    return ChunkStorage.getHexInfoColRow(hex.col, hex.row, target);
  }

  /**
   * Retrieves hex info from oddq coordinates.
   * @param {number} col - column of hex in oddq coords
   * @param {number} row - row of hex in oddq coords
   * @param {?HexInfo} target - reuse 
   * @returns {HexInfo} - info on given hex
   */
  static getHexInfoColRow(col, row, target=null) {
    // set stub if nothing
    const result = HexInfo.recOrNew(target, 'loading');
    // locate chunk
    const chunk = Chunk.fromColRow(col, row);
    const key = `${chunk.col},${chunk.row}`;
    // find the id of hex in array
    const in_hex_col = rem(col, Chunk.SIZE);
    const in_hex_row = rem(row, Chunk.SIZE);
    const hex_id = in_hex_row * Chunk.SIZE + in_hex_col;
    // copy if there is anything
    if (ChunkStorage.storage.has(key)) {
      ChunkStorage.storage.get(key)[hex_id].copyTo(result);
    }
    return result;
  }

  static updateStatus(hex) {
    
  }

  // TODO(ivan): not finished
  static storage = new Map();
  static loading = new Map();
}

/**
 * Simple lightweight utility class for managing object pools.
 * Usage: mostly to reuse events and other objects.
 *
 * NOTE(ivan): why not a class which I would then new Pool() blah blah blah.
 *             Well... this thing is a flat thing specifically for EventBus.
 *             And it is kinda simple stupid and good for cache.
 *
 * DONE(ivan): Step through this in a debugger
 */
export class FixedPool {
  /**
   * Note(ivan): return from this queue if something is removed
   */ 
  static pool = [];

  /**
   * Registers new fixed pool. Returns id to use.
   */
  static register(size) {
    const pool = FixedPool.pool;
    pool.push(size);
    const id = pool.length - 1;
    for (let i = 0; i <= size; ++i) {
      pool.push(null);
    }
    return id;
  }

  /**
   * Push object to a dedicated pool, returns boolean on sucess (if pool is not overflown).
   */
  static reuse(id, object) {
    const pool = FixedPool.pool;
    const free_id = id;
    const free = FixedPool.free(id);
    const top = FixedPool.top(id);
    if (free > 0) {
      pool[free_id]--;
      pool[top - 1] = object;
    } else {
      console.error("FixedPool: pool overflow");
    }
  }

  static top(id) {
    return (id + 1) + FixedPool.free(id);
  }

  static free(id) {
    const pool = FixedPool.pool;
    return pool[id];
  }

  /**
   * Get an object from pool or null if nothing is there.
   */
  static object(id) {
    const pool = FixedPool.pool;
    const free_id = id;
    const free = FixedPool.free(id);
    const top = FixedPool.top(id);
    
    // take the object
    const object = pool[top];
    pool[top] = null;

    if (object !== null) {
      // increase free slots count
      pool[free_id]++;
    } else {
      console.error("FixedPool: pool underflow");
    }

    return object;
  }
}

/**
 * struct BoundingBox(minX: number, maxX: number, minY: number, maxY: number)
 */
class BoundingBox {
  /**
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   */
  constructor(minX, maxX, minY, maxY) {
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }

  /** 
   * Reuse the BoundingBox.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {BoundingBox} target 
   * 
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   */
  static rec(target, minX, maxX, minY, maxY) {
    target.minX = minX;
    target.maxX = maxX;
    target.minY = minY;
    target.maxY = maxY;
    return target;
  }

  /** 
   * Reuse the BoundingBox or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?BoundingBox} target 
   *
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   */
  static recOrNew(target, minX, maxX, minY, maxY) {
    return target instanceof BoundingBox
      ? BoundingBox.rec(target, minX, maxX, minY, maxY)
      : new BoundingBox(minX, maxX, minY, maxY);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?BoundingBox} first
   * @param {?BoundingBox} second 
   *
   * @param {number} minX
   * @param {number} maxX
   * @param {number} minY
   * @param {number} maxY
   */
  static equals(first, second) {
    return first  instanceof BoundingBox &&
           second instanceof BoundingBox &&
           first.minX === second.minX &&
           first.maxX === second.maxX &&
           first.minY === second.minY &&
           first.maxY === second.maxY
  }

  /** 
   * Compares two BoundingBox structs.
   * @param {BoundingBox} other 
   */
  equals(other) {
    return other instanceof BoundingBox &&
           this.minX === other.minX &&
           this.maxX === other.maxX &&
           this.minY === other.minY &&
           this.maxY === other.maxY;
  }

  /** 
   * Clones BoundingBox.
   */
  clone() {
    const minX = this.minX;
    const maxX = this.maxX;
    const minY = this.minY;
    const maxY = this.maxY
    return new BoundingBox(minX, maxX, minY, maxY);
  }

  /** 
   * Copies contents of this BoundingBox to other
   * @param {BoundingBox} other
   */
  copyTo(other) {
    const minX = this.minX;
    const maxX = this.maxX;
    const minY = this.minY;
    const maxY = this.maxY
    return BoundingBox.rec(other, minX, maxX, minY, maxY);
  }

  /**
   * Takes two hexes (in any order) transforms them into bounding box.
   * @param {object} hex1 in odd-q coordinates
   * @param {object} hex2 in odd-q coordinates
   */
  static fromTwoHexes(hex1, hex2, target=null) {
    const minX = Math.min(hex1.col, hex2.col);
    const maxX = Math.max(hex1.col, hex2.col);
    const minY = Math.min(hex1.row, hex2.row);
    const maxY = Math.max(hex1.row, hex2.row);

    return BoundingBox.recOrNew(target, minX, maxX, minY, maxY);
  }
}


/**
 * Cull the visible hexes on the screen.
 * Usage: for rendering purposes, for fetching relevant data.
 */
function cull_hexes(camera, target=null) {
  let top_left_hex;
  let bot_right_hex;
  
  // reuse target for now for camera
  let bb = camera.visiblePlane(0, target);

  {
    const oddq = xy_nearest_oddq(bb.minX, bb.minY);
    oddq.col -= 1;
    oddq.row -= 1;
    top_left_hex = oddq;
  }
  {
    const oddq = xy_nearest_oddq(bb.maxX, bb.maxY);
    oddq.col += 1;
    oddq.row += 1;
    bot_right_hex = oddq;
  }

  return BoundingBox.fromTwoHexes(top_left_hex, bot_right_hex, target);
}

/**
 * here goes everything that is render specific
 * for example default render scale
 */
class Render {
  /**
   * Scale of objects on screen.
   * USAGE(ivan): basically you transform logical coordianates to pixels this way.
   */
  static SCALE = 30;
  static DPR = window.devicePixelRatio;

  static camera = camera;

  /**
   * The canvas to draw to.
   * @type {HTMLCanvasElement}
   */
  static screen = document.getElementById('hex-grid');
  /**
   * The current active canvas contex.
   * @type {CanvasRenderingContext2D} ctx
   */
  static screen_ctx = Render.screen.getContext('2d');

  /**
   * Translate clientX, clientY to logical coordinates on plane with height z
   * @param {number} client_x  - client x pixel
   * @param {number} client_y  - client y pixel
   * @param {number=} plane_z  - logical z depth
   * @param {?Vec2}   target   - reuse vec2
   */
  static xy_client_to_plane(client_x, client_y, plane_z=0, target=null) {
    const camera = Render.camera;
    const pixel_scale = camera.getUnitScale(plane_z) * Render.SCALE;
    let {x: canvas_x, y: canvas_y} = Render.screen.getBoundingClientRect();

    let global_x = camera.x - ((canvas_x - client_x) * Render.DPR + Render.screen.width  / 2) / pixel_scale;
    let global_y = camera.y - ((canvas_y - client_y) * Render.DPR + Render.screen.height / 2) / pixel_scale;
    return Vec2.recOrNew(target, global_x, global_y);
  }

  /**
   * @param {number} x - x logical coord
   * @param {number} y - y logical coord
   * @param {number} z - z logical coord
   * @param {?Vec2}  target - reuse object
   *
   * @returns {Vec2} coordinates on screen
   */
  static xyz_to_screen(x, y, z, target=null) {
    return Render.xyz_to_buffer(x, y, z, Render.screen, target);
  }

  /**
   * @param {number} x - x logical coord
   * @param {number} y - y logical coord
   * @param {number} z - z logical coord
   * @param {HTMLCanvasElement} buffer - texture buffer
   * @param {?Vec2}  target - reuse object
   *
   * @returns {Vec2} coordinates on buffer
   */
  static xyz_to_buffer(x, y, z, buffer, target=null) {
    const camera = Render.camera;
    const pixel_scale = camera.getUnitScale(z) * Render.SCALE;

    const buffer_x = (x - camera.x) * pixel_scale + buffer.width  / 2;
    const buffer_y = (y - camera.y) * pixel_scale + buffer.height / 2;

    return Vec2.recOrNew(target, buffer_x, buffer_y);
  }

  static path_hexagon(ctx, size) {
    Render.path_nagon(ctx, 6, size);
  }
  
  /**
   * @param {CanvasRenderingContext2D} ctx - context
   */
  static path_nagon(ctx, n, size) {
    const turns = n;
    const angle = 2 * Math.PI / turns;

    ctx.translate(-size * Math.cos(angle), -size * Math.sin(angle));
    ctx.beginPath()
    for (let i = 0; i < turns; i += 1) {
      ctx.lineTo(size, 0);
      ctx.translate(size, 0);
      ctx.rotate(angle);
    }
    ctx.closePath();
    ctx.translate(size * Math.cos(angle), size * Math.sin(angle));
  }

  /**
   * @type {HTMLCanvasElement} outlineBuffer;
   */
  static outline_buffer = document.createElement('canvas');
  /**
   * @type {CanvasRenderingContext2D} outline_ctx
   */
  static outline_ctx = Render.outline_buffer.getContext('2d');
  static outline_unit = null;
  /**
   * fast logarithmic outline drawing
   */
  static draw_outline(z) {
    const buffer = Render.outline_buffer;
    const ctx    = Render.outline_ctx;


    const camera = Render.camera;
    
    const prev = Render.outline_unit;
    const unit = camera.getUnitScale(z);
    const line_width = 0.75 * unit;


    // find how many iterations I need 
    const bb       = cull_hexes(camera);

    // now we need to calculate the size of the individual tile
    // so that we would seamlessly repeat them
    const hexagon_size        = unit * Render.SCALE;
    const hexagon_height      = hexagon_size * Math.sqrt(3)
    const hexagon_width       = hexagon_size * 2;

    const tile_width  = 3 * hexagon_size;
    const tile_height = hexagon_height;

    const tile_center_x =  tile_width / 2;
    const tile_center_y = tile_height / 2;
    
    // set up the buffer to the proper height/width
    // if scaling has not changed more than twice a size
    // then reuse
    if (prev && prev / unit < 1.5 && unit / prev < 1.5) {
      const hex = new HexOddQ(bb.minX, bb.minY);
      const vec = oddq_to_vec2(hex);
      const hex_center_screen = Render.xyz_to_screen(vec.x, vec.y, z, buffer)
      Render.screen_ctx.drawImage(buffer,
        0, 0, 
        (Render.screen.width  + hexagon_width  * 4) * (prev/unit), 
        (Render.screen.height + hexagon_height * 4) * (prev/unit), 
        hex_center_screen.x - tile_center_x,
        hex_center_screen.y - tile_center_y,
        Render.screen.width  + hexagon_width  * 4, 
        Render.screen.height + hexagon_height * 4, 
      )
      return;
    }
    Render.outline_unit = unit;
    buffer.width  = Math.round(Render.screen.width  * 2 + hexagon_width  * 4);
    buffer.height = Math.round(Render.screen.height * 2 + hexagon_height * 4);
    ctx.clearRect(0, 0, buffer.width, buffer.height);
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = line_width;
    ctx.imageSmoothingEnabled = false;
    // draw one tile
    function draw_one_tile(x, y) {
      ctx.save()
      // set up the ctx
      // draw hexagon
      ctx.translate(x + tile_center_x, y + tile_center_y);
      // draw `arms`
      ctx.beginPath()

      ctx.moveTo(-3 * hexagon_size / 2,                   0);
      ctx.lineTo(-2 * hexagon_size / 2,                   0);

      ctx.moveTo(-2 * hexagon_size / 2,                   0);
      ctx.lineTo(-1 * hexagon_size / 2,  hexagon_height / 2);

      ctx.moveTo(-2 * hexagon_size / 2,                   0);
      ctx.lineTo(-1 * hexagon_size / 2, -hexagon_height / 2);

      ctx.moveTo(-1 * hexagon_size / 2,  hexagon_height / 2);
      ctx.lineTo( 1 * hexagon_size / 2,  hexagon_height / 2);

      ctx.moveTo( 1 * hexagon_size / 2,  hexagon_height / 2);
      ctx.lineTo( 2 * hexagon_size / 2,                   0);

      ctx.moveTo( 2 * hexagon_size / 2,                   0);
      ctx.lineTo( 3 * hexagon_size / 2,                   0);

      ctx.moveTo( 2 * hexagon_size / 2,                   0);
      ctx.lineTo( 1 * hexagon_size / 2, -hexagon_height / 2);

      ctx.stroke();
      ctx.restore();
    }
    
    //ctx.save();
    //ctx.beginPath();
    //ctx.rect(0, 0, Math.round(16 * tile_width), Math.round(16 * tile_height));
    //ctx.clip();
    for (let w = 0; w < 16; w += 1) {
      for (let h = 0; h < 16; h += 1) {
        draw_one_tile(w * tile_width, h * tile_height);
      }
    }
    //ctx.restore();

    // draw tiles
    {
      let current_width  = Math.round(16 * tile_width);
      let current_height = Math.round(16 * tile_height);
      while (current_width < buffer.width || current_height < buffer.height) {
        // do 3 drawing calls
        ctx.drawImage(buffer, 
          0, 0, 
          current_width, current_height,
          current_width, 0, 
          current_width, current_height
        );
        ctx.drawImage(buffer, 
          0, 0, 
          current_width, current_height,
                      0, current_height, 
          current_width, current_height
        );
        ctx.drawImage(buffer, 
          0, 0, 
          current_width, current_height,
          current_width, current_height, 
          current_width, current_height
        );

        current_width  *= 2;
        current_height *= 2;
      }
    }

    // finally output it to the screen
    const hex = new HexOddQ(bb.minX, bb.minY);
    const vec = oddq_to_vec2(hex);
    const hex_center_screen = Render.xyz_to_screen(vec.x, vec.y, z, buffer)
    Render.screen_ctx.drawImage(buffer,
      0, 0, buffer.width, buffer.height,
      hex_center_screen.x - tile_center_x,
      hex_center_screen.y - tile_center_y,
      buffer.width, buffer.height
    )
  }

  /**
   * draw hexagon with specified color and text using cartesian coordinates
   */
  static draw_hexagon_xyz(x, y, z=0, operation) {
    const {x: screen_x, y: screen_y} = Render.xyz_to_screen(x, y, z);

    const ctx  = Render.screen_ctx;
    const unit = Render.camera.getUnitScale(z); 
    const size = Render.SCALE * Render.camera.getUnitScale(z);

    ctx.save()
    {
      ctx.translate(screen_x, screen_y);
      // create path for hexagon and stroke / fill it
      Render.path_hexagon(ctx, size);
      operation(ctx, unit, size)
    }
    ctx.restore();
  }

  /**
   * draw hexagon with specified color and text using oddq coordinates
   */
  static draw_hexagon_oddq(hex, z, operation, buffer=Render.screen) {
    const {x: x, y: y} = oddq_to_vec2(hex);
    Render.draw_hexagon_xyz(x, y, z, operation, buffer);
  }
}

Render.screen_ctx.scale(Render.DPR, Render.DPR);

const EMPTY    = { r: 255, g: 255, b: 255 }; // white
const SELECTED = { r: 255, g: 215, b: 0   }; // gold
const DONE     = { r: 176, g: 196, b: 182 }; // #B0C4B6
const TODO     = { r: 255, g: 165, b: 0   }; // orange
const LOCKED   = { r: 175, g: 157, b: 154 }; // #AF9D9A
const LOADING  = { r: 128, g: 128, b: 128 }; // grey


// Function to linearly interpolate between two values
function lerp(start, end, t) {
  return start + t * (end - start);
}

function draw_grid() {
  let bounding_box = cull_hexes(camera, canvas);
  

  const HIGHLIGHT_DURATION = 200;


  function lerp_color(start, end, t) {
    const r = Math.round(lerp(start.r, end.r, t));
    const g = Math.round(lerp(start.g, end.g, t));
    const b = Math.round(lerp(start.b, end.b, t));
    return {r, g, b};
  }

  function color_to_style(color) {
    return `rgb(${color.r}, ${color.g}, ${color.b}`;
  }

  let new_active = [];
  let new_done = [];
  let new_locked = [];
  
  let hex = new HexOddQ(0, 0);
  let info = new HexInfo();
  // draw color
  for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
    for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
      // reuse hex
      HexOddQ.rec(hex, col, row);

      let calculated_color = calculate_color(hex, info);
      let value = ChunkStorage.getHexInfoOddQ(hex, info);

      if (calculated_color === DONE) {
        new_done.push({...value, ...hex});
      } else if (calculated_color === TODO) {
        new_active.push({...value, ...hex});
      } else if (calculated_color === LOCKED) {
        new_locked.push({...value, ...hex});
      }

      if (hex.equals(under_cursor.hex)) {
        let nt = Math.min(Date.now() - under_cursor.time, HIGHLIGHT_DURATION) / HIGHLIGHT_DURATION;
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      } else if (hex.equals(selected.hex)) {
        let nt = Math.abs(Math.sin(Date.now() / 500));
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      }

      if (calculated_color !== EMPTY) {
        Render.draw_hexagon_oddq(hex, 0, (ctx) => {
          ctx.fillStyle = color_to_style(calculated_color);
          ctx.fill();
        });
      }
    }
  }
  // draw text
  if (camera.z <= 2) {
    // draw text
    //
    const size = camera.z0UnitScale * Render.SCALE;
    ctx.font = `${size/3}px Arial`; // Adjust font size as needed to fit the circle
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center'; // Center the text horizontally
    ctx.textBaseline = 'middle'; // Center the text vertically
    for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
      for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
        // reuse hex
        HexOddQ.rec(hex, col, row);
        Render.draw_hexagon_oddq(hex, 0, (ctx, unit, size) => {
          const text = `${hex.col} ${hex.row}`;
          // now add text there 
          ctx.fillText(text, 0, 0);
        })
      }
    }
  }

  Render.draw_outline(0);
  update_lists(new_active, new_done, new_locked);
}

function calculate_color(hex, reuse=null) {
  const row = hex.row;
  const col = hex.col;

  // NOTE(ivan): I will reuse this
  const info = ChunkStorage.getHexInfoOddQ(hex, reuse);

  // okay we do it right there
  const current_status    = info.status;
  const current_completed = info.completed;
  const current_is_empty  = info.type === "empty";
  
  let below_col, left_col, right_col;
  let below_row, left_row, right_row;

  // okay get them
  if (col & 1) {
    below_col = col;
    below_row = row + 1;
    
    left_col  = col - 1;
    left_row  = row + 1;

    right_col = col + 1;
    right_row = row + 1;
  } else {
    below_col = col;
    below_row = row + 1;

    left_col  = col - 1;
    left_row  = row;

    right_col = col + 1;
    right_row = row;
  }

  let below_status, left_status, right_status;
  let below_completed, left_completed, right_completed;
  let below_is_empty, left_is_empty, right_is_empty;

  ChunkStorage.getHexInfoColRow(below_col, below_row, info);
  below_status    = info.status;
  below_completed = info.completed;
  below_is_empty  = info.type === "empty";
  ChunkStorage.getHexInfoColRow(left_col, left_row, info);
  left_status    = info.status;
  left_completed = info.completed;
  left_is_empty  = info.type === "empty";
  ChunkStorage.getHexInfoColRow(right_col, right_row, info);
  right_status    = info.status;
  right_completed = info.completed;
  right_is_empty  = info.type === "empty";

  let calculated_color;

  const all_loaded = current_status !== 'loading'
                  && below_status   !== 'loading'
                  && left_status    !== 'loading'
                  && right_status   !== 'loading';

  if (all_loaded) {
    const unlocked = (below_is_empty || below_completed)
                  && ( left_is_empty ||  left_completed)
                  && (right_is_empty || right_completed);
    if (current_is_empty) {
      calculated_color = EMPTY;
    } else if (current_completed) {
      calculated_color = DONE;
    } else if (unlocked) {
      calculated_color = TODO;
    } else {
      calculated_color = LOCKED;
    }
  } else {
    calculated_color = LOADING;
  }

  return calculated_color;
}

function draw_animation_frame() {
  canvas.width  = canvas.clientWidth  * Render.DPR;
  canvas.height = canvas.clientHeight * Render.DPR;

  // update camera fovX, fovY automatically
  camera.width  =  canvas.width  / Render.SCALE;
  camera.height =  canvas.height / Render.SCALE;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw_grid();
}

let canvasFrame = null;

let UI_event_queue = [];
let UI_event_frame = [];

function register_event(event_type, data) {
  const event = {type: event_type, data: data};
  UI_event_queue.push(event);
}

function swap_event_buffers() {
  const frame = UI_event_queue;
  UI_event_queue = UI_event_frame;
  UI_event_frame = frame;
}

let game = {
  tool: 'drag',
  running: false,
  controller: null
};


async function save_selected() {
  const form_data = new URLSearchParams();

  form_data.append('task_description', selected.description);
  form_data.append('task_title', selected.title);
  form_data.append('task_id', selected.id);
  form_data.append('task_completed', selected.completed);
  form_data.append('user_id', user_name); 

  const response = await fetch(`/api/boards/${board_id}/cells?row=${selected.hex.row}&col=${selected.hex.col}`, {
      method: 'POST', 
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form_data.toString()
  });

  const data = await response.json();
  if (response.ok) {
    register_event()
    update_form_with_new_data(data);
    let coords = chunk_coords(selected.hex);
    chunk.get(`${coords.col}, ${coords.row}`).data[`${selected.hex.col}, ${selected.hex.row}`] = {
      'id': selected.id,
      'completed': selected.completed
    }
  }
};

function wire_dom_events() {
  if (game.controller) {
    console.error("trying to wire to dom, while already wired");
    return;
  }

  // register new abort controller
  game.controller = new AbortController();
  const signal = game.controller.signal;

  //
  // override default behaviour
  // to simplify refactor / future additions
  //
  function $(parent) {
    const child = Object.create(parent);
    child.addEventListener = function (type, callback, options) {
      return parent.addEventListener(type, callback, {...options, signal: signal});
    };
    return child;
  }

  $(canvas).addEventListener('mousedown', (event) => {
    if (event.target === event.currentTarget) {
      register_event('GAME_MOUSE_DOWN', {pageX: event.pageX, pageY: event.pageY});
    }
  });
  $(canvas).addEventListener('focus',      () => register_event('UI_FOCUSED'      , {target: 'hexgrid'}));
  $(canvas).addEventListener('blur',       () => register_event('UI_BLURRED'      , {target: 'hexgrid'}));
  $(canvas).addEventListener('mouseenter', () => register_event('REQUEST_UI_FOCUS', {target: 'hexgrid'}));
  $(canvas).addEventListener('mouseleave', () => register_event('REQUEST_UI_BLUR' , {target: 'hexgrid'}));
  $(canvas).addEventListener('mousemove', (event) => register_event('GAME_MOUSE_MOVED', event));
  $(canvas).addEventListener('dblclick', () => register_event('HEXAGON_SELECTED', {hex: under_cursor.hex}));
  $(canvas).addEventListener('wheel', (event) => {
    event.preventDefault()
    register_event('REQUEST_CAMERA_ZOOM', {delta: event.wheelDelta});
  });

  $(document).addEventListener('mouseup', (event) => register_event('MOUSE_UP', event));
  $(document).addEventListener('keydown', (event) => {
    if (event.repeat) {
        return;
    }
    if (event.target === canvas) {
      register_event('GAME_KEY_PRESSED', {
        key: event.key
      });
    }
  });

  $(remove_button).addEventListener('click', () => register_event('REQUEST_HEX_REMOVE', {hex: selected.hex}));

  $(list_view).addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {

      let col = parseInt(event.target.getAttribute('data-col'));
      let row = parseInt(event.target.getAttribute('data-row'));

      register_event('LIST_ITEM_SELECTED', {hex: {col, row}});
    }
  });

  $(task_form).addEventListener('change', () => register_event('EDITOR_CHANGED', {}));
  $(task_form).addEventListener('submit', (event) => {
    event.preventDefault(); 
    register_event('REQUEST_SAVE_SELECTED', {});
  });

  $(toggle_list_view).addEventListener('click', () => {
    register_event('REQUEST_UI_TOGGLE', {});
  }); 
}

function unwire_dom_events() {
  if (game.controller === null) {
    console.error("nothing to unwire");
    return;
  }
  game.controller.abort();
  game.controller = null;
}

function process_pending_UI_events() {
  swap_event_buffers();
  for (const e of UI_event_frame) {
    const type = e.type;
    const event = e.data;
    //console.log(type);
    switch (type) {
      case 'REQUEST_SAVE_SELECTED': {
        save_selected().then( () => {
          register_event('SAVED_SELECTED', {})
        }).catch( () => {
          register_event('SAVE_SELECTED_FAILED', {})
        });
        break;
      }
      case 'MOUSE_UP': {
        register_event('REQUEST_DRAG_STOP', {});
        break;
      }
      case 'REQUEST_DRAG_START': {
        const size = Render.SCALE * camera.z0UnitScale;
        const drag_transform = {
          get x() {
            return (this.savedPageX - this.pageX) / size;
          },
          get y() {
            return (this.savedPageY - this.pageY) / size;
          },
          z: 0,
          pageX: event.pageX,
          pageY: event.pageY,
          savedPageX: event.pageX,
          savedPageY: event.pageY
        }
        camera.applyTransform();
        camera.transform = drag_transform;
        camera.isDragged = true;
        register_event('DRAG_STARTED', {drag: drag_transform});
        break;
      }
      case 'DRAG_STARTED': {
        break;
      }
      case 'GAME_MOUSE_DOWN': {
        if (game.tool === 'drag') {
          register_event('REQUEST_DRAG_START', {pageX: event.pageX, pageY: event.pageY});
        }
        break;
      }
      case 'CAMERA_DRAGGED': {
        break;
      }
      case 'GAME_MOUSE_MOVED': {
        if (camera.isDragged) {
          camera.transform.pageX = event.pageX;
          camera.transform.pageY = event.pageY;
          register_event('CAMERA_DRAGGED', {});
        }
        let {x: global_x, y: global_y} = Render.xy_client_to_plane(event.clientX, event.clientY, 0);
        let hex = xy_nearest_oddq(global_x, global_y)
        if (!(hex.equals(under_cursor.hex))) {
          hex.copyTo(under_cursor.hex);
          under_cursor.time = Date.now()
        }
        register_event('UNDER_CURSOR_CHANGED', {});
        break;
      }
      case 'REQUEST_DRAG_STOP': {
        if (camera.isDragged) {
          camera.isDragged = false;
          camera.applyTransform();
          register_event('DRAG_STOPPED', {});
          register_event('CAMERA_MOVED', {});
        }
        break;
      }
      case 'UI_FOCUSED':
        break;
      case 'UI_BLURRED': {
        break;
      }
      case 'REQUEST_UI_TOGGLE': {
        const which = toggle_list_with_editor();
        register_event('UI_TOGGLED', {to: which});
        break;
      }
      case 'REQUEST_UI_FOCUS': {
        if (event.target === 'hexgrid') {
          canvas.focus();
        }        
        break;
      }
      case 'REQUEST_UI_BLUR': {
        if (event.target === 'hexgrid') {
          canvas.blur();
        }
        break;
      }
      case 'CAMERA_MOVED': {
        break;
      }
      case 'REQUEST_CAMERA_MOVE': {
        const transition_duration = 200;

        const transition = {
          get x() {
            return lerp(this.fromX, this.toX, this.t) - this.toX;
          },
          get y() {
            return lerp(this.fromY, this.toY, this.t) - this.toY;
          },
          z: 0,
          get t() {
            return Math.min((Date.now() - this.start) / transition_duration, 1);
          },
          fromX: camera.x,
          fromY: camera.y,
          toX: event.x,
          toY: event.y,
          start: Date.now()
        }
        camera.applyTransform();
        camera.x = event.x;
        camera.y = event.y;
        camera.transform = transition;
        register_event('CAMERA_MOVED', {x: event.x, y: event.y});
        break;
      }
      case 'CAMERA_ZOOMED': {
        break;
      }
      case 'REQUEST_CAMERA_ZOOM': {
        camera.z0UnitScale += event.delta / 3000;
        register_event('CAMERA_ZOOMED', {});
        break;
      }
      case 'GAME_KEY_PRESSED': {
        if (event.key.toLowerCase() === 'm') {
          game.tool
          register_event('MOVE_TOOL_ACTIVATED', {});
        } else if (event.key === 'Escape') {
          // default
          register_event('DRAG_TOOL_ACTIVATED', {}); 
        }
        break;
      }
      case 'MOVE_TOOL_ACTIVATED': {
        break;
      }
      case 'DRAG_TOOL_ACTIVATED': {
        break;
      }
      case 'REQUEST_HEX_REMOVE_FAILED': {
        // possibly implement UI indicator of failure
        // check connection or whatever
        break;
      } 
      case 'REQUEST_HEX_REMOVE': {
        request_cell_remove(event.hex)
          .then(() => register_event('HEX_REMOVED', {hex: event.hex}))
          .catch(error => register_event('REQUEST_HEX_REMOVE_FAILED', {hex: event.hex, cause: error}));
        break;
      }
      case 'HEX_REMOVED': {
        let coords = chunk_coords(event.hex);
        let key = `${coords.col}, ${coords.row}`;
        if (chunk.has(key)) {
          delete chunk.get(key).data[`${event.hex.col}, ${event.hex.row}`];
        }
        form_new_task();
        break;
      }
      case 'HEX_CONTENT_CHANGED': {
        break;
      }
      case 'EDITOR_CHANGED': {
        update_selected();
        register_event('SELECTED_CHANGED', {});
        break;
      }
      case 'SELECTED_CHANGED': {
        let old = list_view.querySelector(".selected");
        if (old !== null) {
          old.classList.remove('selected');
        }
        let now = list_view.querySelector(`[data-col="${selected.hex.col}"][data-row="${selected.hex.row}"]`);
        if (now !== null) {
          now.classList.add('selected');
          now.scrollIntoView();
        }
        break;
      }
      case 'HEXAGON_SELECTED': {
        selected.hex = HexOddQ.rec(selected.hex, event.hex.col, event.hex.row);
        selected.time = Date.now();
        register_event('SELECTED_CHANGED', {});
        request_hex(selected.hex)
          .then(update_form_with_new_task)
          .catch(console.log);
        let pos = oddq_to_vec2(event.hex);
        register_event('REQUEST_CAMERA_MOVE', pos);
        break;
      }
      case 'LIST_ITEM_SELECTED': {
        register_event('HEXAGON_SELECTED', event);
        let pos = oddq_to_vec2(event.hex);
        register_event('REQUEST_CAMERA_MOVE', pos);
        break;
      }
    }
  }
  UI_event_frame.length = 0;
}

function loop() {
  if (canvasFrame) {
    cancelAnimationFrame(canvasFrame);
    canvasFrame = null;
  }
  if (!game.running) {
    return
  }

  process_pending_UI_events();
  draw_animation_frame();
  ChunkStorage.requestAllVisible(cull_hexes(camera, canvas));

  {
    cam_debug.textContent = `cam(${camera.x.toFixed(5)}, ${camera.y.toFixed(5)}, ${camera.z.toFixed(5)})`;
    const bb = camera.visiblePlane(0);
    const size = camera.z0UnitScale * Render.SCALE;
    const width =  (bb.maxX - bb.minX) * size;
    const height = (bb.maxY - bb.minY) * size;

    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width/2 - width/2, canvas.height/2 - height/2, width, height);
  }

  canvasFrame = requestAnimationFrame(loop);
}


function try_gracefully_empty_queue() {
  const max_cycles = 100;
  const cycles = 0;
  while (!(UI_event_queue.length === 0 || cycles >= max_cycles)) {
    process_pending_UI_events();
    cycles += 1;
  }
  if (cycles >= max_cycles) {
    console.error(`exceeded {max_cycles} cycles, possible loop`);
  }
  return UI_event_queue.length === 0;
}

function game_stop() {
  unwire_dom_events();
  try_gracefully_empty_queue();
  game.running = false;
}

function game_start() {
  wire_dom_events();

  canvas.tabIndex = 0;
  canvas.focus();
  register_event('HEXAGON_SELECTED', {hex: under_cursor.hex});

  game.running = true;
  requestAnimationFrame(loop);
}

game_start();
