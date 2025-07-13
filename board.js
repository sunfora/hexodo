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

let size = 30

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
 * struct Chunk(row: number, col: number)
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
   * @param {number} row
   * @param {number} col
   */
  constructor(row, col) {
    this.row = row;
    /* TODO(ivan): fregr */ this.col = col;
  }

  /** 
   * Reuse the Chunk.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {Chunk} target 
   * 
   * @param {number} row
   * @param {number} col
   */
  static rec(target, row, col) {
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
   * @param {number} row
   * @param {number} col
   */
  static recOrNew(target, row, col) {
    return target instanceof Chunk
      ? Chunk.rec(target, row, col)
      : new Chunk(row, col);
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
    return new Chunk(row, col);
  }

  /** 
   * Copies contents of this Chunk to other
   * @param {Chunk} other
   */
  copyTo(other) {
    const row = this.row;
    const col = this.col
    return Chunk.rec(other, row, col);
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
   * @param {HexOddQ} hex - hex coords 
   * @param {?Chunk} - reuse
   * @returns {?Chunk} - chunk which contains hex
   */
  static fromHex(hex, target) {
    const col = Math.floor(hex.col / Chunk.SIZE);
    const row = Math.floor(hex.row / Chunk.SIZE);
    return Chunk.recOrNew(target, col, row);
  }
}

/**
 * struct HexInfo(
 *    status: string, 
 *    type?: string = null, 
 *    title?: string = null, 
 *    completed?: boolean = null, 
 *    description?: string = null
 *  )
 */
class HexInfo {
  /**
   * @param {string} status
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  constructor(status, type, title, completed, description) {
    this.status = status;
    this.type = type === undefined ? null : type;
    this.title = title === undefined ? null : title;
    this.completed = completed === undefined ? null : completed;
    this.description = description === undefined ? null : description;
  }

  /** 
   * Reuse the HexInfo.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {HexInfo} target 
   * 
   * @param {string} status
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static rec(target, status, type, title, completed, description) {
    target.status = status;
    target.type = (type === undefined)? null : type;
    target.title = (title === undefined)? null : title;
    target.completed = (completed === undefined)? null : completed;
    target.description = (description === undefined)? null : description;
    return target;
  }

  /** 
   * Reuse the HexInfo or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?HexInfo} target 
   *
   * @param {string} status
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static recOrNew(target, status, type, title, completed, description) {
    return target instanceof HexInfo
      ? HexInfo.rec(target, status, type, title, completed, description)
      : new HexInfo(status, type, title, completed, description);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?HexInfo} first
   * @param {?HexInfo} second 
   *
   * @param {string} status
   * @param {string=} type
   * @param {string=} title
   * @param {boolean=} completed
   * @param {string=} description
   */
  static equals(first, second) {
    return first  instanceof HexInfo &&
           second instanceof HexInfo &&
           first.status === second.status &&
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
    const type = this.type;
    const title = this.title;
    const completed = this.completed;
    const description = this.description
    return new HexInfo(status, type, title, completed, description);
  }

  /** 
   * Copies contents of this HexInfo to other
   * @param {HexInfo} other
   */
  copyTo(other) {
    const status = this.status;
    const type = this.type;
    const title = this.title;
    const completed = this.completed;
    const description = this.description
    return HexInfo.rec(other, status, type, title, completed, description);
  }
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
    {cycles: 8,   data: []},  // 0  lod 0 near camera
    {cycles: 16,  data: []},  // 1  lod 1 huge near camera
    {cycles: 32,  data: []},  // 2  lod 2 minimap
    {cycles: 64,  data: []},  // 3  individual hexes
    {cycles: 128, data: []}   // 4  slowly load past camera
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
   * request all visible hexes inside bounding box
   * @param {BoundingBox} bounding_box 
   */
  static requestAllVisible(bounding_box) {
    // check how many chunks 
    // prioritize those in center
  // TODO(ivan): not finished
  }

  static requestChunk(col, row) {
  // TODO(ivan): not finished
  }

  static processInbox() {
  // TODO(ivan): not finished
    for (const action of ChunkStorage.inbox) {
      
    }
  }

  /**
   * Retrieves hex info from oddq coordinates.
   * @param {HexOddQ} - coordinates
   * @param {?HexInfo} target - reuse 
   */
  static getHexInfo(hex, target) {
    
  }

  static updateStatus(hex) {
    
  }

  // TODO(ivan): not finished
  static storage = new Map();
}

/**
 * Simple lightweight utility class for managing object pools.
 * Usage: mostly to reuse events and other objects.
 *
 * NOTE(ivan): why not a class which I would then new Pool() blah blah blah.
 *             Well... this thing is a flat thing specifically for EventBus.
 *             And it is kinda simple stupid and good for cache.
 *
 * TODO(ivan): Step through this in a debugger
 */
class FixedPool {
  /**
   * Note(ivan): return from this queue if something is removed
   */ 
  static pool = [];

  /**
   * Registers new fixed pool. Returns id to use.
   */
  static register(size) {
    pool.push(size);
    const id = pool.length - 1;
    for (let i = 0; i < size; ++i) {
      pool.push(null);
    }
    return id;
  }

  /**
   * Push object to a dedicated pool, returns boolean on sucess (if pool is not overflown).
   */
  static reuse(id, object) {
    const size = pool[id];
    if (size > 0) {
      pool[id]--;
      pool[id + size] = object;
    } else {
      console.error("FixedPool: pool overflow");
    }
  }

  /**
   * Get an object from pool or null if nothing is there.
   */
  static object(id) {
    const object = pool[id + pool[id] + 1];
    if (object !== null) {
      pool[id]++;
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
function cull_hexes(camera, canvas, target=null) {
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
 * Convert logical odd-q coordinates to actual center of the hexagon on the screen.
 * Usage: to draw the hexagon
 *
 * @param {HexOddQ} hex - the hex on screen
 * @param {?Vec2} dest - the resulting point in pixels
 * returns {Vec2} - oddq on screen in pixels
 */
function oddq_on_screen(hex, camera, canvas, dest=null) {
  const center_screen_px_x = canvas.width  / 2;
  const center_screen_px_y = canvas.height / 2;
  
  const {x: hex_logical_cart_x, y: hex_logical_cart_y} = oddq_to_vec2(hex); 
  const {x: cam_logical_cart_x, y: cam_logical_cart_y} = camera;

  const hex_screen_px_x = center_screen_px_x + (hex_logical_cart_x - cam_logical_cart_x) * size;
  const hex_screen_px_y = center_screen_px_y + (hex_logical_cart_y - cam_logical_cart_y) * size;

  return Vec2.recOrNew(dest, hex_screen_px_x, hex_screen_px_y); 
}

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
      chunk.get(key).loaded = true;
      requests_made -= 1;
    }).catch( (error) => {
      console.log(error);
      requests_made -= 1;
    })
    return null;
  }
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
  static camera = camera;

  /**
   * The canvas to draw to.
   * @type {HTMLCanvasElement}
   */
  static canvas = document.getElementById('hex-grid');
  /**
   * The current active canvas contex.
   * @type {CanvasRenderingContext2D} ctx
   */
  static ctx = Render.canvas.getContext('2d');

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
    let {x: canvas_x, y: canvas_y} = Render.canvas.getBoundingClientRect();

    let global_x = camera.x - (canvas_x - client_x + Render.canvas.width  / 2) / pixel_scale;
    let global_y = camera.y - (canvas_y - client_y + Render.canvas.height / 2) / pixel_scale;
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
    const camera = Render.camera;
    const pixel_scale = camera.getUnitScale(z) * Render.SCALE;

    const screen_x = (x - camera.x) * pixel_scale + Render.canvas.width  / 2;
    const screen_y = (y - camera.y) * pixel_scale + Render.canvas.height / 2;

    return Vec2.recOrNew(target, screen_x, screen_y);
  }
  
  static path_nagon(n) {
    const ctx = Render.ctx;
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
   * draw hexagon with specified color and text using cartesian coordinates
   */
  static draw_hexagon_xyz(x, y, z=0, style="transparent", text="") {
    const {x: screen_x, y: screen_y} = Render.xyz_to_screen(x, y, z);

    const ctx  = Render.ctx;
    const unit = Render.camera.getUnitScale(z); 
    const size = Render.SCALE * Render.camera.getUnitScale(z);

    ctx.save()
    {
      ctx.translate(screen_x, screen_y);
      // create path for hexagon and stroke / fill it
      Render.path_nagon(6);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 0.25 * unit;
      ctx.fillStyle = style;
      ctx.stroke();
      ctx.fill();

      // now add text there 
      ctx.font = `${size / 3}px Arial`; // Adjust font size as needed to fit the circle
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center'; // Center the text horizontally
      ctx.textBaseline = 'middle'; // Center the text vertically
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
  }

  /**
   * draw hexagon with specified color and text using oddq coordinates
   */
  static draw_hexagon_oddq(hex, z=0, style="transparent", text="") {
    const {x: x, y: y} = oddq_to_vec2(hex);
    Render.draw_hexagon_xyz(x, y, z, style, text);
  }
}

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

  for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
    for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
      // reuse hex
      HexOddQ.rec(hex, col, row);

      let value = from_chunk(hex);
      let calculated_color = calculate_color(hex);

      if (calculated_color === DONE) {
        new_done.push(value);
      } else if (calculated_color === TODO) {
        new_active.push(value);
      } else if (calculated_color === LOCKED) {
        new_locked.push(value);
      }

      if (hex.equals(under_cursor.hex)) {
        let nt = Math.min(Date.now() - under_cursor.time, HIGHLIGHT_DURATION) / HIGHLIGHT_DURATION;
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      } else if (hex.equals(selected.hex)) {
        let nt = Math.abs(Math.sin(Date.now() / 500));
        calculated_color = lerp_color(calculated_color, SELECTED, nt);
      }         
      Render.draw_hexagon_oddq(hex, 0, color_to_style(calculated_color), `${hex.col} ${hex.row}`);
    }
  }
  update_lists(new_active, new_done, new_locked);
}

function calculate_color(hex) {
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

  // update camera fovX, fovY automatically
  camera.width  =  canvas.width  / 30;
  camera.height =  canvas.height / 30;
  
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
        size = camera.z0UnitScale * 30;
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

  {
    cam_debug.textContent = `cam(${camera.x.toFixed(5)}, ${camera.y.toFixed(5)}, ${camera.z.toFixed(5)})`;
    const bb = camera.visiblePlane(0);
    const x = bb.minX * size;
    const y = bb.minY * size;
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
