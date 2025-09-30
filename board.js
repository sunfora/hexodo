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
  Vec2,
  Vec3
} from "./coords.js";

import * as gmath from "./gmath.js"

const board_id = window.appConfig.board.board_id;
const user_name = window.appConfig.user_id;

const list_view = document.getElementById('list-view');

const active_section = document.getElementById('active-section');
const toggle_list_view = document.getElementById('toggle-list-view');

const active_list = document.getElementById('active-list');
const done_list = document.getElementById('done-list');
const locked_list = document.getElementById('locked-list');

const task_form_copy_button = document.getElementById('task-form-copy');

const task_form = document.getElementById('task-form');
const task_title = document.getElementById('task-title');
const task_description = document.getElementById('task-description');

const remove_button = document.getElementById('remove-button');

const canvas = document.getElementById('hex-grid');
const cam_debug = document.getElementById('cam-debug');

const title = document.querySelector('#task-title');
const description = document.querySelector('#task-description');
const header = document.querySelector('#task-form-header');
const completed = document.querySelector('#task-completed');

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
 * Usage: for tracking down the visible part of the world.
 */
class Camera {
  #DEFAULT_TRANSFORM = new Vec3(0, 0, 0);
  #DEFAULT_POSITION  = new Vec3(0, 0, 0);

  /**
   * Is camera moved by user?
   */
  isDragged = false;

  isFreezed = false;
  swapPosition  = new Vec3(0, 0, 0);
  swapTransform = new Vec3(0, 0, 0);

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
  
  withFreeze(callback) {
    this.freeze();
    try {
      callback();
    } finally {
      this.unfreeze();
    }
  }

  /**
   * Freeze camera. 
   * USAGE(ivan): for atomic draws.
   */
  freeze() {
    if (!this.isFreezed) {
      this.isFreezed = true;
      Vec3.rec(this.swapTransform, this.transform.x, this.transform.y, this.transform.z);
      this.swapTransform.x = this.transform.x;
      this.swapTransform.y = this.transform.y;
      this.swapTransform.z = this.transform.z
      this.swapPosition.x = this.position.x;
      this.swapPosition.y = this.position.y;
      this.swapPosition.z = this.position.z
      this.swap();
    } else {
      console.error("attempt to freeze camera while freezed");
    }
  }

  /** 
   * Swaps transform <-> swapTransform
   *       position  <-> swapPosition
   * NOTE(ivan):  implementation detail of freeze/unfreeze
   * USAGE(ivan): if careful, maybe you can use it for something else
   *              remember to make swapTransform and swapPosition Vec3 back
   */
  swap() {
    const position = this.position;
    this.position = this.swapPosition;
    this.swapPosition = position;

    const transform = this.transform;
    this.transform = this.swapTransform;
    this.swapTransform = transform;
  }

  /**
   * Unfreezes freezed camera (it is a checked swap)
   */
  unfreeze() {
    if (this.isFreezed) {
      this.isFreezed = false;
      this.swap(); 
    } else {
      console.error("attempt to unfreeze while freezed");
    }
  }
}

class Inventory {
  // TODO(ivan): add documentation
  MAX_SIZE = 256;
  // TODO(ivan): add documentation
  items = [];
  // TODO(ivan): add documentation
  isLoaded = false;
  // TODO(ivan): add documentation
  isOpen = false;
  // TODO(ivan): add documentation
  scroll = 0.0;
  
  // TODO(ivan): add documentation
  async load() {
    for (let i = 0; i < 100; ++i) {
      const info = new HexInfo("todo", 100500 + i, "task", `test {i}`, `description {i}`);
      this.items.push(info);
    }
    this.isLoaded = true;
  }

  // TODO(ivan): add documentation
  toggle() {
    if (this.isOpen) {
      this.isOpen = false;
    } else {
      this.isOpen = true;
    }
  }
}

/**
 * NOTE(ivan): 
 * > I had a game object
 *   but it seems like I would benefit from more structured 
 *   gamestate like class where everything is kinda in the same place
 * > What I primarely want here is... I want to track which tools are used.
 *   What actions I do now. And so and so forth.
 */
class GameState {
  camera;
  render;
  storage;
  selected;
  underCursor;
  running;
  tool;
  domEventsController;
  inventory;

  constructor() {
    this.camera = new Camera();
    this.render = new Render(this.camera, new ScreenDPR(window.devicePixelRatio, canvas));
    this.storage = new ChunkStorage();
    this.inventory = new Inventory();

    this.selected = {
      hex: new HexOddQ(0, 0),
      info: new HexInfo(),
      time: Date.now()
    }
    this.underCursor = {
      hex: new HexOddQ(0, 0),
      info: new HexInfo(),
      time: Date.now()
    }
    this.running = false;
    this.tool = "drag";
    this.domEventsController = null;
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
  for (const {hex: hex_old, info: info_old} of old_array) {
    let has = false;
    for (const {hex: hex_new, info: info_new} of new_array) {
      const element_eq = hex_old.equals(hex_new) && info_old.equals(info_new)
      if (element_eq) {
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
    for (const {hex: hex, info: info} of new_list) {
      const listItem = document.createElement('li');
      listItem.textContent = info.title; 
      listItem.setAttribute('data-col', hex.col);
      listItem.setAttribute('data-row', hex.row);
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

function update_form(header_message) {
  title.value        = game.selected.info.title;
  description.value  = game.selected.info.description;
  completed.checked  = game.selected.info.completed;
  header.textContent = header_message;
}

function update_selected() {
  game.selected.info.title       = title.value;
  game.selected.info.description = description.value;
  game.selected.info.completed   = completed.checked;
}


async function request_cell_remove(which) {
  const response = await fetch(`api/boards/${board_id}/cells?row=${which.row}&col=${which.col}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

function stub_task() {
  return new HexInfo('dirty', null, 'task', '', false, '');
}

function form_new_task() {
  stub_task().copyTo(game.selected.info);
  update_form('Create task');
}

function form_edit_task(task) {
  task.copyTo(game.selected.info);
  update_form(`Edit task: ${game.selected.info.id}`);
}

function task_from_backend(backend_data) {
  return new HexInfo(
    'dirty',
    backend_data.task_id,
    'task',
    backend_data.task_title,
    backend_data.task_completed,
    backend_data.task_description
  );
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

/**
 * struct Chunk(col: number, row: number)
 */
class Chunk {
  /**
   * The size of the chunk in terms of size x size of hexes
   * So currently 16 x 16 = 256
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
 * The system responsible for handling all kind of fetches from the server.
 * When it comes to hexes.
 */
class ChunkStorage {
  /**
   * unprocessed
   */
  inbox = [];
  
  cycles = 0;
  
  queue = [
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
  LOD_0 = 1;

  /**
   * Level of Details 1 (number chunks: 4x4)
   * includes: 
   *   - title 
   *   - block type
   */
  LOD_1 = 4;

  /**
   * Level of Details 2 (number chunks: 16x16)
   * includes: 
   *   - single low resolution texture
   *   TODO(ivan): implement on server side
   */
  LOD_2 = 16;

  /**
   * Not more than 10 individual fetches from the user.
   */
  MAX_TOTAL_CONCURRENT_REQUESTS = 10;

  /**
   * Client should not exceed this number of requests per session.
   * TODO(ivan): create strict serverside limit and return SERVER_IS_BUSY or something
   */
  MAX_CHUNK_CONCURRENT_REQUESTS = 8;

  /**
   * Optimal requests to server
   */
  OPT_CHUNK_CONCURRENT_REQUESTS = 4;

  /**
   * Client should not exceed this number of requests per session.
   * TODO(ivan): create strict serverside limit and return SERVER_IS_BUSY or something
   */
  MAX_CELL_CONCURRENT_REQUESTS = 4;

  /**
   * Optimal requests of individual cells to the server
   */
  OPT_CELL_CONCURRENT_REQUESUT = 2;

  total_requests = 0;
  cell_requests = 0;
  chunk_requests = 0;
  
  // TODO(ivan): not finished
  queue(event) {
    switch (event.type) {
      case 'REQUEST_ALL_CAMERA_VISIBLE':
        this.requestAllVisible(event.bounding_box);
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
  requestAllVisible(bounding_box) {
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
        if (!this.isLoaded(col, row) && !this.isLoading(col, row)) {
          this.requestChunk(col, row)
        }
      }
    }
  }
  
  /**
   * Returns the chunk cells.
   * @param {number} col - chunk col
   * @param {number} row - chunk row
   */
  cellsColRow(col, row) {
  }

  /**
   * Returns the chunk cells.
   * @param {number} col - chunk col
   * @param {number} row - chunk row
   */
  cellsChunk(chunk) {
  }

  /**
   * Checks is chunk loaded?
   */
  isLoaded(col, row) {
    const key = `${col},${row}`;
    const storage = this.storage;
    return storage.has(key);
  }

  /**
   * Checks is chunk loading?
   */
  isLoading(col, row) {
    const key = `${col},${row}`;
    const loading = this.loading;
    return loading.has(key);
  }
  
  /**
   * Send request to the server for a chunk, write it to storage.
   * @returns {Response} - the result of operation
   */
  async requestChunk(col, row) {
    const key = `${col},${row}`;

    const loading = this.loading;
    const storage = this.storage;

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
      if (!this.isLoaded(col, row)) {
        chunk = new Array(Chunk.SIZE * Chunk.SIZE).fill(null);
        for (let i = 0; i < chunk.length; ++i) {
          chunk[i] = new HexInfo('dirty');
        }
        this.storage.set(key, chunk);
      } else {
        chunk = this.storage.get(key);
      }

      // set them to be empty 
      chunk.forEach(info => HexInfo.rec(info, 'dirty'));
      // set values
      for (const point of points) {
        const point_id = this.cr_hexID(point.cell_col, point.cell_row);
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

  processInbox() {
  // TODO(ivan): not finished
    for (const action of this.inbox) {
      
    }
  }

  /**
   * Retrieves hex info from oddq coordinates.
   * @param {HexOddQ} - oddq coordinates
   * @param {?HexInfo} target - reuse 
   * @returns {HexInfo} - info on given hex
   */
  oddq_getHexInfo(hex, target=null) {
    return this.cr_getHexInfo(hex.col, hex.row, target);
  }

  cr_hexID(col, row) {
    const in_hex_col = gmath.rem(col, Chunk.SIZE);
    const in_hex_row = gmath.rem(row, Chunk.SIZE);
    const hex_id = in_hex_row * Chunk.SIZE + in_hex_col;
    return hex_id;
  }

  cr_refChunk(col, row) {
    const chunk = Chunk.fromColRow(col, row);
    const key = `${chunk.col},${chunk.row}`;
    return this.storage.get(key);
  }
  
  oddq_hexLoaded(hex) {
    const chunk = Chunk.fromHexOddQ(hex);
    return this.isLoaded(chunk.col, chunk.row);   
  }

  cr_hexLoaded(col, row) {
    const chunk = Chunk.fromColRow(col, row);
    return this.isLoaded(chunk.col, chunk.row);   
  }

  oddq_updateHexInfo(hex, info) {
    this.cr_updateHexInfo(hex.col, hex.row, info);
  }

  cr_updateHexInfo(col, row, info) {
    const chunk = this.cr_refChunk(col, row);
    const id    = this.cr_hexID(col, row);
    if (chunk) {
      info.copyTo(chunk[id]);
    } else {
      console.error("not loaded"); 
    }
  }

  cr_updateHexInfoStatus(col, row, status) {
    const chunk = this.cr_refChunk(col, row);
    const id    = this.cr_hexID(col, row);
    if (chunk) {
      chunk[id].status = status;
    } else {
      console.error("not loaded"); 
    }
  }
  
  EMPTY = new HexInfo('dirty')

  // TODO(ivan): add comment 
  cr_markNeighboursDirty(col, row) {
    this.cr_updateHexInfoStatus(
      HexOddQ.cr_topCol(col, row), 
      HexOddQ.cr_topRow(col, row),
      "dirty"
    );
    this.cr_updateHexInfoStatus(
      HexOddQ.cr_topLeftCol(col, row), 
      HexOddQ.cr_topLeftRow(col, row),
      "dirty"
    );
    this.cr_updateHexInfoStatus(
      HexOddQ.cr_topRightCol(col, row), 
      HexOddQ.cr_topRightRow(col, row),
      "dirty"
    );
  }

  // TODO add comment
  cr_removeCell(col, row) {
    this.cr_updateHexInfo(col, row, this.EMPTY);
    this.cr_markNeighboursDirty(col, row);
  }

  /**
   * Retrieves hex info from oddq coordinates.
   * @param {number} col - column of hex in oddq coords
   * @param {number} row - row of hex in oddq coords
   * @param {?HexInfo} target - reuse 
   * @returns {HexInfo} - info on given hex
   */
  cr_getHexInfo(col, row, target=null) {
    // set stub if nothing
    const result = HexInfo.recOrNew(target, 'loading');
    
    // locate chunk
    const chunk = Chunk.fromColRow(col, row);
    const key = `${chunk.col},${chunk.row}`;
    // find the id of hex in array
    const hex_id = this.cr_hexID(col, row);
    // copy if there is anything
    if (this.storage.has(key)) {
      const in_storage = this.storage.get(key)[hex_id];
      in_storage.copyTo(result);
    }
    return result;
  }

  // TODO(ivan): not finished
  storage = new Map();
  loading = new Map();
}

/**
 * struct RGB(r: number, g: number, b: number)
 */
class RGB {
  /**
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  /** 
   * Reuse the RGB.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {RGB} target 
   * 
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  static rec(target, r, g, b) {
    target.r = r;
    target.g = g;
    target.b = b;
    return target;
  }

  /** 
   * Reuse the RGB or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?RGB} target 
   *
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  static recOrNew(target, r, g, b) {
    return target instanceof RGB
      ? RGB.rec(target, r, g, b)
      : new RGB(r, g, b);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?RGB} first
   * @param {?RGB} second 
   *
   * @param {number} r
   * @param {number} g
   * @param {number} b
   */
  static equals(first, second) {
    return first  instanceof RGB &&
           second instanceof RGB &&
           first.r === second.r &&
           first.g === second.g &&
           first.b === second.b
  }

  /** 
   * Compares two RGB structs.
   * @param {RGB} other 
   */
  equals(other) {
    return other instanceof RGB &&
           this.r === other.r &&
           this.g === other.g &&
           this.b === other.b;
  }

  /** 
   * Clones RGB.
   */
  clone() {
    const r = this.r;
    const g = this.g;
    const b = this.b
    return new RGB(r, g, b);
  }

  /** 
   * Copies contents of this RGB to other
   * @param {RGB} other
   */
  copyTo(other) {
    const r = this.r;
    const g = this.g;
    const b = this.b
    return RGB.rec(other, r, g, b);
  }

  static lerp(x, y, t, target=null) {
    const r = gmath.lerp(x.r, y.r, t)
    const g = gmath.lerp(x.g, y.g, t)
    const b = gmath.lerp(x.b, y.b, t)
    return RGB.recOrNew(target, r, g, b);
  }
  
  get style() {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }
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

  get centerX() {
    return (this.minX + this.maxX) / 2;
  }
  get centerY() {
    return (this.minY + this.maxY) / 2;
  }
  get width() {
    return this.maxX - this.minX;
  }
  get height() {
    return this.maxY - this.minY;
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
 * Canvas which respects HiDPI, setting the default scale.
 */
class ScreenDPR {
  /**
   * the buffer to draw to
   * @type {HTMLCanvasElement} 
   */
  device;

  /**
   * swap buffer
   * @type {HTMLCanvasElement} 
   */
  swap;

  /**
   * The scaled context.
   * @type {CanvasRenderingContext2D} ctx
   */
  ctx;

  /**
   * The swap context.
   * @type {CanvasRenderingContext2D} ctx
   */
  swapctx;


  constructor(dpr=window.devicePixelRatio, canvas=document.createElement('canvas')) {
    this.device = canvas;
    this.swap = document.createElement('canvas');
    this.swapctx = this.swap.getContext('2d');

    this.#dpr = dpr;
    this.ctx = this.device.getContext('2d');
    this.ctx.scale(this.#dpr, this.#dpr);
  }

  #dpr;
  /**
   * Device Pixel Ratio
   * @type {number}
   */
  get dpr() {
    return this.#dpr;
  }
  set dpr(value) {
    this.#dpr = value;
    this.ctx.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
  }
  
  preserveImage(callback) {
    const old_width = this.width;
    const old_height = this.height;
    const w = this.device.width;
    const h = this.device.height
    if (w === 0 || h === 0) {
      callback();
      return;
    }

    this.swap.width  = w;
    this.swap.height = h;
    this.swapctx.drawImage(this.device, 
      0, 0, w, h,
      0, 0, w, h
    );
    callback();
    this.ctx.drawImage(this.swap,
      0, 0, w, h,
      0, 0, old_width, old_height
    );
  }

  get deviceWidth() {
    return this.device.width;
  }
  set deviceWidth(value) {
    this.device.width = value;
    this.ctx.scale(this.#dpr, this.#dpr);
  }

  get deviceHeight() {
    return this.device.height;
  }
  set deviceHeight(value) {
    this.device.height = value;
    this.ctx.scale(this.#dpr, this.#dpr);
  }

  get width() {
    return this.device.width / this.dpr;
  }
  set width(value) {
    this.deviceWidth = value * this.dpr;
  }

  get height() {
    return this.device.height / this.dpr;
  }
  set height(value) {
    this.deviceHeight = value * this.dpr;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
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
  scale = 30;
  
  /**
   * The screen/buffer to draw to.
   * @type {ScreenDPR}
   */
  screen;

  /**
   * Camera for render to cull the visible area.
   * @type {Camera}
   */
  camera;
  
  /**
   * @param {Camera} camera            - camera for render to cull the visible area
   * @param {ScreenDPR} screen - the output buffer where the drawing will happen
   * @param {Object} [options]
   * @param {number} [options.dpr=window.devicePixelRatio]   - device pixel ratio for screen to set
   * @param {number} [options.scale=30] - unit scale for the coordinates
   */
  constructor(camera, screen, {scale = 30}={}) {
    this.camera = camera;
    this.screen = screen;
    this.scale = scale;
    this.outlineScreen = new ScreenDPR(this.screen.dpr);
  }
 
  /**
   * Take the camera and make it aligned to screen width / screen height
   * respecting dpr and scale
   */
  cameraToScreen() {
    this.camera.width  = this.screen.width / this.scale; 
    this.camera.height = this.screen.height / this.scale;
  }
  
  drawCameraDebugRectangle() {
    const bb = this.camera.visiblePlane(0);
    const size = this.unitPixelScale(0);

    const debug_width =  (bb.maxX - bb.minX) * size;
    const debug_height = (bb.maxY - bb.minY) * size;
    const debug_x = this.xCenterScreen - (debug_width  / 2);
    const debug_y = this.yCenterScreen - (debug_height / 2);

    {
      this.screen.ctx.save();
      this.screen.ctx.strokeStyle = "red";
      this.screen.ctx.fillStyle = "red";
      this.screen.ctx.fillRect(this.xCenterScreen - 1, this.yCenterScreen - 10, 2, 20);
      this.screen.ctx.fillRect(this.xCenterScreen - 10, this.yCenterScreen - 1, 20, 2);
      this.screen.ctx.lineWidth = 2;
      this.screen.ctx.strokeRect(
        debug_x, debug_y, 
        debug_width, debug_height
      );
      this.screen.ctx.restore();
    }
  }
  

  screenChanged = false;

  /**
   * Update screen dimension with respect to the visible dimension for the user.
   * @method
   */
  updateScreenDimensions = ((dpr, width, height) => function () {
    if (dpr    === window.devicePixelRatio && 
        width  === this.screen.device.clientWidth &&
        height === this.screen.device.clientHeight) {
      this.screenChanged = false;
      return;
    }
    dpr    = window.devicePixelRatio;
    width  = this.screen.device.clientWidth;
    height = this.screen.device.clientHeight;

    this.screen.dpr    = dpr;
    this.screen.width  = width;
    this.screen.height = height;
    this.screenChanged = true;
  })();

  /**
   * Translate clientX, clientY to logical coordinates on plane with height z
   * @param {number} client_x  - client x pixel
   * @param {number} client_y  - client y pixel
   * @param {number=} plane_z  - logical z depth
   * @param {?Vec2}   target   - reuse vec2
   */
  xy_clientToLogical(client_x, client_y, plane_z=0, target=null) {
    const camera = this.camera;
    const pixel_scale = this.unitPixelScale(plane_z);
    const screen_box = this.screen.device.getBoundingClientRect();
    let logical_x = camera.x + (client_x - screen_box.x - this.xCenterScreen) / pixel_scale;
    let logical_y = camera.y + (client_y - screen_box.y - this.yCenterScreen) / pixel_scale;
    return Vec2.recOrNew(target, logical_x, logical_y);
  }

  /**
   * @param {number} x - x logical coord
   * @param {number} y - y logical coord
   * @param {number} plane_z - z logical coord / depth
   * @param {?Vec2}  target - reuse object
   *
   * @returns {Vec2} coordinates on screen
   */
  xy_logicalToScreen(x, y, plane_z, target=null) {
    const camera = this.camera;
    const pixel_scale = this.unitPixelScale(plane_z);
    const screen_x = (x - camera.x) * pixel_scale + this.xCenterScreen;
    const screen_y = (y - camera.y) * pixel_scale + this.yCenterScreen;
    return Vec2.recOrNew(target, screen_x, screen_y);
  }

  /**
   * @param {HexOddQ} hex - hex in oddq coords
   * @param {number} y - y logical coord
   * @param {number} plane_z - z logical coord / depth
   * @param {?Vec2}  target - reuse object
   *
   * @returns {Vec2} coordinates on screen
   */
  oddq_logicalToScreen(hex, plane_z, target=null) {
    const vec = oddq_to_vec2(hex, target);
    return this.xy_logicalToScreen(vec.x, vec.y, plane_z, vec)
  }

  get xCenterScreen() {
    return this.screen.width / 2;
  }
  get yCenterScreen() {
    return this.screen.height / 2;
  }
  
  unitPixelScaleFromCamera(z) {
    return this.unitPixelScale(this.camera.z - z);
  }

  /**
   * How big is the scale of unit with respect to scale (screen logical pixels [without dpr])?
   */ 
  unitPixelScale(z) {
    return this.camera.getUnitScale(z) * this.scale; 
  }

  /**
   * How big is the scale of unit with respect to scale and dpr (scren actual pixels)?
   */ 
  unitDevicePixelScale(z) {
    return this.unitPixelScale(z) * this.screen.dpr;
  }

  static path_hexagon(ctx, size) {
    Render.path_nagon(ctx, 6, size);
  }

  static xy_path_hexagon(x, y, ctx, size) {
    Render.xy_path_nagon(x, y, ctx, 6, size);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx - context
   */
  static xy_path_nagon(x, y, ctx, n, size) {
    const angle = 2 * Math.PI / n;
    const side_angle = Math.PI * (n - 2) / (2 * n);
    const w = Math.cos(side_angle) * size;
    const h = Math.sin(side_angle) * size;
    let origin = new Vec2(x - w, y - h);
    let direct = new Vec2(size, 0);
    
    ctx.beginPath()
    ctx.moveTo(origin.x, origin.y);
    for (let i = 0; i < n; ++i) {
      Vec2.add(origin, direct, origin);
      ctx.lineTo(origin.x, origin.y);
      direct.rotateBy(angle)
    }
    ctx.closePath();
  }
  
  /**
   * @param {CanvasRenderingContext2D} ctx - context
   */
  static path_nagon(ctx, n, size) {
    Render.xy_path_nagon(0, 0, ctx, n, size);
  }

  prerenderedChunks = new Map();

  /**
   * 
   */
  drawChunkText(col, row, z) {
    const key = `${col},${row}`;
    
    let vec = null;
    for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
      for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
        const text = `${hex.col} ${hex.row}`;
        HexOddQ.rec(hex, col, row);
        vec = game.render.oddq_logicalToScreen(hex, 0, vec);
        game.render.screen.ctx.fillText(text, vec.x, vec.y);
      }
    }
  }

  /**
   * @type {ScreenDPR} outlineBuffer;
   */
  outlineScreen;
  
  pathTile(x, y, width, height, screen) {
    const ctx = screen.ctx;
    const hexagon_size   = width / 3;
    const hexagon_height = height;
    ctx.translate(x + width / 2, y + height / 2);
    {
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
    }
    ctx.translate(-x - width/2, -y - height/2);
  }

  fillOutlineScreen(tile_width, tile_height) {
    const ctx = this.outlineScreen.ctx;
    const buffer = this.outlineScreen;

    const line_width = ctx.lineWidth;

    ctx.beginPath()
    for (let r = 0; r < 16; ++r) {
      for (let c = 0; c < 16; ++c) {
        this.pathTile(r * tile_width, c * tile_height, tile_width, tile_height, buffer);
      }
    }
    ctx.stroke();

    const tr = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    {
      let current_width  = 16 * tile_width;
      let current_height = 16 * tile_height; 

      while (current_width < buffer.width || current_height < buffer.height) {
        const cwl = Math.ceil(buffer.dpr * (current_width  + line_width) + 2);
        const cw =  Math.ceil(buffer.dpr * (current_width));
        const chl = Math.ceil(buffer.dpr * (current_height + line_width) + 2);
        const ch =  Math.ceil(buffer.dpr * (current_height));
        // do 3 drawing calls
        ctx.drawImage(buffer.device, 
          0, 0, 
          cwl, chl,
          cw, ch, 
          cwl, chl,
        );
        ctx.drawImage(buffer.device, 
          0, 0, 
          cwl, chl,
          0, ch, 
          cwl, chl,
        );
        ctx.drawImage(buffer.device, 
          0, 0, 
          cwl, chl,
          cw, 0,
          cwl, chl,
        );

        current_width  *= 2;
        current_height *= 2;
      }
    }
    ctx.setTransform(tr)
  }
  
  OUTLINE_LINE_WEIGTH = 0.25;
  lastKnownOutlineZ = undefined;
  lastKnownCameraZ = undefined;

  drawOutlineScreen(z) {
    const buffer = this.outlineScreen;
    const ctx    = this.outlineScreen.ctx;

    const tile = this.tile(0, 0, z);

    const render_width  = this.screen.width  + (tile.width * 4);
    const render_height = this.screen.height + (tile.height * 4);

    const camera = this.camera;
    const unit = camera.getUnitScale(z);
    const line_width = this.OUTLINE_LINE_WEIGTH * unit;

    buffer.device.width  =  render_width * this.screen.dpr;
    buffer.device.height = render_height * this.screen.dpr;
    buffer.dpr = this.screen.dpr;
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = line_width;
    ctx.imageSmoothingEnabled = false;
    this.fillOutlineScreen(tile.width, tile.height);
  }
  
  hexagonSize(z) {
    return this.unitPixelScale(z);
  }

  tile(x, y, z, bb=null) {
    const hexagon_size = this.hexagonSize(z);
    const hexagon_height = hexagon_size * Math.sqrt(3)

    const tile_width  = 3 * hexagon_size;
    const tile_height = hexagon_height;
    return BoundingBox.recOrNew(bb, x, x + tile_width, y, y + tile_height);
  }

  /**
   * fast logarithmic outline drawing
   */
  redrawOutline(z, bb) {
    this.drawOutlineScreen(z);
    this.outputOutlineScreenToScreen(z, bb);

    this.lastKnownOutlineZ = z;
    this.lastKnownCameraZ  = this.camera.z;
  }

  drawOutlineDirect(z, bounding_box) {
    const ctx = this.screen.ctx;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = this.camera.getUnitScale(z) * this.OUTLINE_LINE_WEIGTH;

    let hex = new HexOddQ(0, 0);
    let vec = new Vec2(0, 0);
    let tile = this.tile(0, 0, z);
    
    ctx.beginPath();
    for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
      for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
        HexOddQ.rec(hex, col, row);
        this.oddq_logicalToScreen(hex, z, vec);
        this.tile(vec.x, vec.y, z, tile)
        this.pathTile(tile.minX, tile.minY, tile.width, tile.height, this.screen); 
      }
    }
    ctx.stroke();
  }

  outputOutlineScreenToScreen(z, bb) {
    const hex = new HexOddQ(bb.minX - 1, bb.minY - 1);
    const hex_center_screen = this.oddq_logicalToScreen(hex, z)
    const tile = this.tile(hex_center_screen.x, hex_center_screen.y, z);

    const tr2 = this.screen.ctx.getTransform();
    this.screen.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.screen.ctx.drawImage(this.outlineScreen.device,
      0, 0, 
      this.outlineScreen.device.width,
      this.outlineScreen.device.height,
      this.outlineScreen.dpr * (tile.centerX),
      this.outlineScreen.dpr * (tile.centerY),
      this.outlineScreen.device.width,
      this.outlineScreen.device.height,
    )
    this.screen.ctx.setTransform(tr2)
  }
 
  /**
   * @method
   */
  drawOutline = ((cameraZ, lastZ) => function(z, bounding_box, reuse=true) {
    const visible = (bounding_box.maxY - bounding_box.minY + 1)
                  * (bounding_box.maxX - bounding_box.minX + 1);
  
    reuse &= (z === lastZ && cameraZ === this.camera.z && !this.screenChanged);
    cameraZ = this.camera.z;
    lastZ = z;
                 
    if (visible > 100 && reuse) {
      this.outputOutlineScreenToScreen(z, bounding_box);
    } else if (visible > 100) {
      this.redrawOutline(z, bounding_box);
    } else {
      this.drawOutlineDirect(z, bounding_box);
    }
  })();

  /**
   * draw hexagon with specified operation
   */
  xy_drawHexagon(x, y, z=0, operation=this.id) {
    const {x: screen_x, y: screen_y} = this.xy_logicalToScreen(x, y, z);

    const ctx  = this.screen.ctx;
    const unit = this.camera.getUnitScale(z); 
    const size = this.hexagonSize(z);

    ctx.save()
    {
      ctx.translate(screen_x, screen_y);
      // create path for hexagon and stroke / fill it
      Render.path_hexagon(ctx, size);
      operation(ctx, unit, size);
    }
    ctx.restore();
  }
  
  /**
   * draw hexagon with specified color and text using oddq coordinates
   */
  oddq_drawHexagon(hex, z=0, operation) {
    const {x: x, y: y} = oddq_to_vec2(hex);
    this.xy_drawHexagon(x, y, z, operation);
  }
}

const game = new GameState();

const EMPTY    = new RGB(255, 255, 255 ); // white
const SELECTED = new RGB(255, 215, 0   ); // gold
const DONE     = new RGB(176, 196, 182 ); // #B0C4B6
const TODO     = new RGB(255, 165, 0   ); // orange
const LOCKED   = new RGB(175, 157, 154 ); // #AF9D9A
const LOADING  = new RGB(128, 128, 128 ); // grey

function status_to_color(status) {
  let calculated_color;
  switch (status) {
    case 'done':
      calculated_color = DONE;
      break;
    case 'empty':
      calculated_color = EMPTY;
      break;
    case 'todo':
      calculated_color = TODO;
      break;
    case 'locked':
      calculated_color = LOCKED;
      break;
    case 'loading':
      calculated_color = LOADING;
      break;
    default:
      debugger;
      break;
  }
  return calculated_color;
}

function draw_grid() {
  let bounding_box = cull_hexes(game.render.camera);
  

  const HIGHLIGHT_DURATION = 200;

  let by_status = new Map();
  
  let hex = new HexOddQ(0, 0);
  let info = new HexInfo();

  // draw color of chunks
  for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
    for (let col = bounding_box.minX; col <= bounding_box.maxX ; col++) {
      // reuse hex
      HexOddQ.rec(hex, col, row);

      let status = update_status(hex, info);
      game.storage.oddq_getHexInfo(hex, info);

      if (!by_status.has(status)) {
        by_status.set(status, []);
      }
      by_status.get(status).push({info: info.clone(), hex: hex.clone()});
    }
  }

  // draw each kind of hexagon
  for (const status of by_status.keys()) {
    let calculated_color = status_to_color(status);
    /* calculated_color !== EMPTY */
    if (true) {
      const ctx  = game.render.screen.ctx;
      ctx.fillStyle = calculated_color.style;
      for (const {hex: hex} of by_status.get(status)) {
        const {x: screen_x, y: screen_y} = game.render.oddq_logicalToScreen(hex, 0);
        const size = game.render.hexagonSize(0);
        // create path for hexagon and stroke / fill it
        Render.xy_path_hexagon(screen_x, screen_y, ctx, size);
        ctx.fill();
      }
    }
  }

  // update colors for selected
  {
    const selected_status = update_status(game.selected.hex)
    let selected_color = status_to_color(selected_status);
    let nt = Math.abs(Math.sin(Date.now() / 500));
    selected_color = RGB.lerp(selected_color, SELECTED, nt);
    game.render.oddq_drawHexagon(game.selected.hex, 0, (ctx) => {
      ctx.fillStyle = selected_color.style;
      ctx.fill();
    })
  }
  // update colors for underCursor
  let under_cursor_nt = Math.min(Date.now() - game.underCursor.time, HIGHLIGHT_DURATION) / HIGHLIGHT_DURATION;

  {
    const under_status = update_status(game.underCursor.hex)
    let under_color = status_to_color(under_status);
    under_color = RGB.lerp(under_color, SELECTED, under_cursor_nt);

    game.render.oddq_drawHexagon(game.underCursor.hex, 0, (ctx) => {
      ctx.fillStyle = under_color.style;
      ctx.fill();
    })
  }

  game.render.drawOutline(0, bounding_box);
  
  // draw text
  if (game.camera.z <= 2) {
    const size = game.render.unitPixelScale(0);
    game.render.screen.ctx.font = `${size/3}px Arial`; // Adjust font size as needed to fit the circle
    game.render.screen.ctx.fillStyle = 'black';
    game.render.screen.ctx.textAlign = 'center'; // Center the text horizontally
    game.render.screen.ctx.textBaseline = 'middle'; // Center the text vertically
    let vec = null;
    for (let row = bounding_box.minY; row <= bounding_box.maxY; row++) {
      for (let col = bounding_box.minX; col <= bounding_box.maxX; col++) {
        HexOddQ.rec(hex, col, row);

        const text = `${hex.col} ${hex.row}`;
        vec = game.render.oddq_logicalToScreen(hex, 0, vec);
        game.render.screen.ctx.fillText(text, vec.x, vec.y);
      }
    }
  }
  
  function draw_outlined_text(hex, text, font_scale=0.5) {
    text = text ?? "";
    // config params I guess 
    const TEXT_HEIGHT = 0.02;
    const SECOND_OUTLINE_HEIGHT = 0.4;

    const ctx = game.render.screen.ctx;

    const unit = game.render.unitPixelScale(TEXT_HEIGHT);
    const font_size = unit * font_scale;
    const offset_y = - unit * Math.cos(60);

    const white_line_width = unit / 10;
    const black_line_width = white_line_width * 1.05;

    ctx.font = `${font_size}px Arial`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center'; // Center the text horizontally
    ctx.textBaseline = 'middle'; // Center the text vertically
    game.render.screen.ctx.lineJoin = 'bevel';

    const vec = game.render.oddq_logicalToScreen(hex, TEXT_HEIGHT);
    vec.y -= offset_y;
    if (gmath.rem(hex.col, 4) >= 2) {
      vec.y += offset_y / 2
    } else {
    }


    // secondary black outline
    if (game.camera.z <= SECOND_OUTLINE_HEIGHT) {
      game.render.screen.ctx.strokeStyle = 'black';
      game.render.screen.ctx.lineWidth = black_line_width;
      game.render.screen.ctx.strokeText(text, vec.x, vec.y);
    }
    
    // primary white outline
    game.render.screen.ctx.strokeStyle = 'white';
    game.render.screen.ctx.lineWidth = white_line_width;
    game.render.screen.ctx.strokeText(text, vec.x, vec.y);

    // text itself
    game.render.screen.ctx.fillText(text, vec.x, vec.y);
  }

  // draw text titles 
  if (game.camera.z <= 2) {
    let under_cursor_drawn = false;

    let scale = 0.5;
    const u_scale = gmath.lerp(scale, scale * 1.15, under_cursor_nt);

    const active_group = by_status.get('todo') ?? [];
    for (const {hex: hex, info: info} of active_group) {
      if (game.underCursor.hex.equals(hex)) {
        draw_outlined_text(hex, info.title, u_scale);
        under_cursor_drawn = true;
      } else {
        draw_outlined_text(hex, info.title, scale);
      }
    }
    if (game.underCursor.hex.equals(game.selected.hex)) {
      draw_outlined_text(game.selected.hex, game.selected.info.title, u_scale);
      under_cursor_drawn = true;
    } else {
      draw_outlined_text(game.selected.hex, game.selected.info.title, scale);
    }

    if (!under_cursor_drawn) {
      draw_outlined_text(game.underCursor.hex, game.underCursor.info.title, u_scale);
    }
  }
 
  update_lists(
    by_status.get('todo') ?? [], 
    by_status.get('done') ?? [], 
    by_status.get('locked') ?? []
  );
}

/**
 * @param {HexOddQ} hex
 */
function update_status(hex, reuse=null) {
  const info = game.storage.oddq_getHexInfo(hex, reuse);

  if (info.status !== 'loading' && info.status !== 'dirty') {
    return info.status;  
  }

  const current_completed = info.completed;
  const current_is_empty  = info.type === "empty";

  let all_loaded = game.storage.cr_hexLoaded(hex.col, hex.row);
  let unlocked = true;

  for (let i = 2; i <= 4; ++i) {
    let col = hex.circleNeighbourCol(i)
    let row = hex.circleNeighbourRow(i)
    game.storage.cr_getHexInfo(col, row, info);
    all_loaded &&= game.storage.cr_hexLoaded(col, row);
    unlocked   &&= info.type === "empty" || info.completed;
  }
  
  let updated_status = 'loading';

  if (all_loaded) {
    if (current_is_empty) {
      updated_status = 'empty';
    } else if (current_completed) {
      updated_status = 'done';
    } else if (unlocked) {
      updated_status = 'todo';
    } else {
      updated_status = 'locked'
    }
  }
  if (game.storage.cr_hexLoaded(hex.col, hex.row)) {
    game.storage.cr_updateHexInfoStatus(hex.col, hex.row, updated_status);
  }
  return updated_status;
}

/**
 * TODO(ivan): add comment
 */
function xy_measure_card(x, y, bb) {
  const card_height = game.render.unitPixelScaleFromCamera(0) * 5;
  const card_width  = card_height * 5 / 7;
  return BoundingBox.recOrNew(bb, x, x + card_width, y, y + card_height);
}

/**
 * TODO(ivan): add comment
 */
function xy_measure_hex(x, y, size, bb) {
  return BoundingBox.recOrNew(bb, x, x + 2 * size, y, y + size * Math.sqrt(3));
}

/**
 *
 */
function br_xy_measure_hex(x, y, size, bb) {
  return BoundingBox.recOrNew(bb, x - 2 * size, x, y - size * Math.sqrt(3), y);
}

function xy_draw_empty_slot(x, y) {
  const dim = xy_measure_card(x, y);
  const card_height = dim.height;
  const card_width  = dim.width;
  const card_round = 5;

  game.render.screen.ctx.beginPath();
  game.render.screen.ctx.roundRect(x, y, card_width, card_height, card_round);
  game.render.screen.ctx.fillStyle = "grey";
  game.render.screen.ctx.fill();
}

function xy_draw_card(x, y) {
  const dim = xy_measure_card(x, y);
  const card_height = dim.height;
  const card_width  = dim.width;
  const card_round = 5;

  game.render.screen.ctx.beginPath();
  game.render.screen.ctx.roundRect(x, y, card_width, card_height, card_round);
  game.render.screen.ctx.fillStyle = "white";
  game.render.screen.ctx.fill();
  
  const hexagon_size    = card_height * 1 / 18;
  const hexagon_padding = card_height / 24;

  const hexdim = xy_measure_hex(
    dim.minX + hexagon_padding, 
    dim.minY + hexagon_padding, 
    hexagon_size
  );
    
  Render.xy_path_hexagon(
    hexdim.centerX, hexdim.centerY,
    game.render.screen.ctx,
    hexagon_size
  );
  game.render.screen.ctx.fillStyle = "orange";
  game.render.screen.ctx.fill();

  br_xy_measure_hex(
    dim.maxX - hexagon_padding, 
    dim.maxY - hexagon_padding, 
    hexagon_size,
    hexdim
  );

  Render.xy_path_hexagon(
    hexdim.centerX, hexdim.centerY,
    game.render.screen.ctx,
    hexagon_size
  );
  game.render.screen.ctx.fillStyle = "orange";
  game.render.screen.ctx.fill();
}

function draw_inventory() {
  const total_slots = game.inventory.MAX_SIZE;

  const inventory_x = game.render.screen.width * 0.1;
  const inventory_y = game.render.screen.height * 0.1;
  const inventory_height = game.render.screen.height * 0.8;
  const inventory_width = game.render.screen.width * 0.8;

  const inventory_padding = 20;

  game.render.screen.ctx.fillRect(inventory_x, inventory_y, inventory_width, inventory_height);
  const card_bb = xy_measure_card(inventory_x + inventory_padding, inventory_y + inventory_padding);
  const font_size = inventory_padding * 8/10;


  const init_gap_x = inventory_padding;
  const gap_y = inventory_padding * 2;

  const space = (inventory_width - 2 * inventory_padding);
  const cards_in_one_row = Math.floor(space / (init_gap_x + card_bb.width));
  const cards_rows = 10;
  
  const gap_x = (inventory_width - (card_bb.width * cards_in_one_row)) / (cards_in_one_row + 1);

  const window_into = new BoundingBox(
    inventory_x + init_gap_x, inventory_x + inventory_width - init_gap_x,
    inventory_y + init_gap_x, inventory_y + inventory_height - init_gap_x
  );
  
  game.render.screen.ctx.save();
  game.render.screen.ctx.beginPath();
  game.render.screen.ctx.rect(window_into.minX, window_into.minY, window_into.width, window_into.height);
  game.render.screen.ctx.clip();

  for (let j = 0; j < cards_rows; ++j) {
    for (let i = 0; i < cards_in_one_row; ++i) {
      const start_x = inventory_x + gap_x + (card_bb.width + gap_x) * i;
      const start_y = card_bb.minY + (gap_y + card_bb.height) * j;
      xy_draw_empty_slot(start_x, start_y);
      // xy_draw_card(start_x, start_y);
      // game.render.screen.ctx.font = `${font_size}px Arial`;
      // game.render.screen.ctx.fillStyle = "white";
      // game.render.screen.ctx.textAlign = 'center'; // Center the text horizontally
      // game.render.screen.ctx.textBaseline = 'middle'; // Center the text vertically
      // game.render.screen.ctx.fillText(`test_card ${j}, ${i}`, start_x + card_bb.width / 2, start_y + card_bb.height + gap_y / 2);
    }
  }
  game.render.screen.ctx.restore();
}

function draw_animation_frame() {

  // update camera fovX, fovY automatically
  game.render.updateScreenDimensions();
  game.render.screen.clear();
  game.render.cameraToScreen();
  game.camera.withFreeze(draw_grid);
  if (game.inventory.isOpen) {
    draw_inventory();
  }
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


// TODO(ivan): reread and find if I already have done save_hex ???
//             why not???!!!
async function save_selected() {
  const form_data = new URLSearchParams();

  form_data.append('task_description', game.selected.info.description);
  form_data.append('task_title',       game.selected.info.title);
  form_data.append('task_id',          game.selected.info.id);
  form_data.append('task_completed',   game.selected.info.completed);
  form_data.append('user_id', user_name); 

  const response = await fetch(`/api/boards/${board_id}/cells?row=${game.selected.hex.row}&col=${game.selected.hex.col}`, {
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
    if (game.storage.oddq_hexLoaded(game.selected.hex)) {
      game.storage.oddq_updateHexInfo(game.selected.hex, game.selected.info);
      // NOTE(ivan): this is needed because we changed the data 
      //             and probably the status has changed
      //             actually I need some method for it
      //
      // TODO(ivan): create a method for marking the dirty flags with updates 
      //             maybe like I have remove_cell somewhere in the codebsase add replace_cell
      // TODO(ivan): test it
      game.storage.cr_markNeighboursDirty(game.selected.hex.col, game.selected.hex.row);
    }
  }
};

function wire_dom_events() {
  if (game.domEventsController) {
    console.error("trying to wire to dom, while already wired");
    return;
  }

  // register new abort controller
  game.domEventsController = new AbortController();
  const signal = game.domEventsController.signal;

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
    event.preventDefault();
    if (event.target === event.currentTarget) {
      register_event('GAME_MOUSE_DOWN', {pageX: event.pageX, pageY: event.pageY});
    }
  });
  $(canvas).addEventListener('contextmenu', (e) => {e.preventDefault();});
  $(canvas).addEventListener('focus',      () => register_event('UI_FOCUSED'      , {target: 'hexgrid'}));
  $(canvas).addEventListener('blur',       () => register_event('UI_BLURRED'      , {target: 'hexgrid'}));
  $(canvas).addEventListener('mouseenter', () => register_event('REQUEST_UI_FOCUS', {target: 'hexgrid'}));
  $(canvas).addEventListener('mouseleave', () => register_event('REQUEST_UI_BLUR' , {target: 'hexgrid'}));
  $(canvas).addEventListener('mousemove', (event) => register_event('GAME_MOUSE_MOVED', event));
  $(canvas).addEventListener('dblclick', () => register_event('HEXAGON_SELECTED', {hex: game.underCursor.hex}));
  $(canvas).addEventListener('wheel', (event) => {
    event.preventDefault()
    register_event('REQUEST_CAMERA_ZOOM', {delta: event.wheelDelta});
  });

  $(document).addEventListener('mouseup', (event) => register_event('MOUSE_UP', event));
  $(document).addEventListener('keydown', (event) => {
    if (event.repeat) {
        return;
    }
    console.log(event);
    if (event.key === "Escape") {
      register_event("REQUEST_UI_FOCUS", {target: 'hexgrid'});
    }
    if (event.target === canvas) {
      register_event('GAME_KEY_PRESSED', {
        key: event.key
      });
    }
  });

  $(remove_button).addEventListener('click', () => register_event('REQUEST_HEX_REMOVE', {hex: game.selected.hex}));
  $(task_form_copy_button).addEventListener('click', (e) => {
    e.preventDefault();
    
    const title = task_title.value;
    const description = task_description.value;

    const text = `[${title}]\n${description}`;
    navigator.clipboard.writeText(text);
  });

  $(list_view).addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {

      let col = parseInt(event.target.getAttribute('data-col'));
      let row = parseInt(event.target.getAttribute('data-row'));

      register_event('LIST_ITEM_SELECTED', {hex: {col, row}});
    }
  });
  
  // NOTE(ivan): ugly hack
  // TODO(ivan): remove this trash
  // why? I need to save the things when input happens but I need to wait a little so...
  let time_when_user_typed = 0;
  let hex = new HexOddQ(0, 0);
  let input_happened = false;
  const INPUT_UPDATE_THRESHOLD = 300;
  function sync_current_selected() {
    const now = Date.now();
    if (!hex.equals(game.selected.hex)) {
      time_when_user_typed = now;
      game.selected.hex.copyTo(hex);
    } else if (now - time_when_user_typed > INPUT_UPDATE_THRESHOLD) {
      if (input_happened) {
        register_event('EDITOR_CHANGED', {})
        input_happened = false;
      }
      time_when_user_typed = now;
    } else {
      time_when_user_typed = now;
    }
  }

  setInterval(sync_current_selected, INPUT_UPDATE_THRESHOLD);

  $(description).addEventListener('input', () => {input_happened = true; sync_current_selected() });
  $(title).addEventListener('input', () => {input_happened = true; sync_current_selected() });
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
  if (game.domEventsController === null) {
    console.error("nothing to unwire");
    return;
  }
  game.domEventsController.abort();
  game.domEventsController = null;
}

function process_pending_UI_events() {
  swap_event_buffers();
  for (const e of UI_event_frame) {
    const type = e.type;
    const event = e.data;
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
        const size = game.render.unitPixelScale(0);
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
        game.camera.applyTransform();
        game.camera.transform = drag_transform;
        game.camera.isDragged = true;
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
        if (game.camera.isDragged) {
          game.camera.transform.pageX = event.pageX;
          game.camera.transform.pageY = event.pageY;
          register_event('CAMERA_DRAGGED', {});
        }
        let {x: logical_x, y: logical_y} = game.render.xy_clientToLogical(event.clientX, event.clientY, 0);
        let hex = xy_nearest_oddq(logical_x, logical_y)
        if (!(hex.equals(game.underCursor.hex))) {
          game.underCursor.time = Date.now()
          hex.copyTo(game.underCursor.hex);
          game.storage.oddq_getHexInfo(game.underCursor.hex, game.underCursor.info)
        }
        register_event('UNDER_CURSOR_CHANGED', {});
        break;
      }
      case 'REQUEST_DRAG_STOP': {
        if (game.camera.isDragged) {
          game.camera.isDragged = false;
          game.camera.applyTransform();
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
        if (event.target === 'description') {
          description.focus();
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
            return gmath.lerp(this.fromX, this.toX, this.t) - this.toX;
          },
          get y() {
            return gmath.lerp(this.fromY, this.toY, this.t) - this.toY;
          },
          z: 0,
          get t() {
            return Math.min((Date.now() - this.start) / transition_duration, 1);
          },
          fromX: game.camera.x,
          fromY: game.camera.y,
          toX: event.x,
          toY: event.y,
          start: Date.now()
        }
        game.camera.applyTransform();
        game.camera.x = event.x;
        game.camera.y = event.y;
        game.camera.transform = transition;
        register_event('CAMERA_MOVED', {x: event.x, y: event.y});
        break;
      }
      case 'CAMERA_ZOOMED': {
        break;
      }
      case 'REQUEST_CAMERA_ZOOM': {
        const value = game.camera.z0UnitScale;
        const diff = event.delta / 3000;
        game.camera.z0UnitScale = gmath.clamp(0.04, value + diff, 4);
        register_event('CAMERA_ZOOMED', {});
        break;
      }
      case 'GAME_KEY_PRESSED': {
        switch (event.key.toLowerCase()) {
          case "c": {
            register_event('REQUEST_UI_FOCUS', {target: 'description'}); 
            break;
          }
          case "o": {
            const col = game.selected.hex.topRightCol;
            const row = game.selected.hex.topRightRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "j": {
            const col = game.selected.hex.botLeftCol;
            const row = game.selected.hex.botLeftRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "w": {
            const col = game.selected.hex.topCol;
            const row = game.selected.hex.topRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "e": {
            const col = game.selected.hex.topRightCol;
            const row = game.selected.hex.topRightRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "q": {
            const col = game.selected.hex.topLeftCol;
            const row = game.selected.hex.topLeftRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "w": {
            const col = game.selected.hex.topCol;
            const row = game.selected.hex.topRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "e": {
            const col = game.selected.hex.topRightCol;
            const row = game.selected.hex.topRightRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "a": {
            const col = game.selected.hex.botLeftCol;
            const row = game.selected.hex.botRightRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "s": {
            const col = game.selected.hex.botCol;
            const row = game.selected.hex.botRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "d": {
            const col = game.selected.hex.botRightCol;
            const row = game.selected.hex.botRightRow;
            register_event('HEXAGON_SELECTED', {hex: new HexOddQ(col, row)}); 
            break;
          }
          case "f": {
            game.inventory.toggle();
            break;
          }
          case " ": {
            game.selected.info.completed = !game.selected.info.completed;
            register_event("REQUEST_SAVE_SELECTED", {});
            break;
          }
        }
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
        const col = event.hex.col;
        const row = event.hex.row;
        if (game.storage.cr_hexLoaded(col, row)) {
          game.storage.cr_removeCell(col, row);
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
        register_event('REQUEST_SAVE_SELECTED', {});
        break;
      }
      case 'SELECTED_CHANGED': {
        let old = list_view.querySelector(".selected");
        if (old !== null) {
          old.classList.remove('selected');
        }
        let now = list_view.querySelector(`[data-col="${game.selected.hex.col}"][data-row="${game.selected.hex.row}"]`);
        if (now !== null) {
          now.classList.add('selected');
          now.scrollIntoView();
        }
        break;
      }
      case 'HEXAGON_SELECTED': {
        game.selected.hex = HexOddQ.rec(game.selected.hex, event.hex.col, event.hex.row);
        game.selected.time = Date.now();
        game.storage.oddq_getHexInfo(game.selected.hex, game.selected.info)

        register_event('SELECTED_CHANGED', {});
        set_rc_to_location(game.selected.hex);
        request_hex(game.selected.hex)
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
  game.storage.requestAllVisible(cull_hexes(game.camera));
  draw_animation_frame();

  {
    const bb = cull_hexes(game.camera);
    const visible = (bb.maxY - bb.minY + 1)
                  * (bb.maxX - bb.minX + 1);
    cam_debug.textContent = `cam(
      ${game.camera.x.toFixed(5)}, 
      ${game.camera.y.toFixed(5)}, 
      ${game.camera.z.toFixed(5)}
    ); 
    visible = ${visible}
    `;
    // render.drawCameraDebugRectangle()
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

function set_rc_to_location(hex) {
  const url = new URL(window.location);
  url.searchParams.set('row', hex.row);
  url.searchParams.set('col', hex.col);
  history.replaceState(null, '', url.toString());
}

function set_rc_from_location(hex) {
  const params = new URLSearchParams(window.location.search);
  const row = parseInt(params.get('row'), 10);
  const col = parseInt(params.get('col'), 10);
  if (!isNaN(row)) {
    hex.row = row;
  }
  if (!isNaN(col)) {
    hex.col= col;
  }
}

function parse_int(param) {
  if (param === null) {
    return param;
  }
  return parseInt(param);
}

function game_start() {
  wire_dom_events();

  canvas.tabIndex = 0;
  canvas.focus();

  set_rc_from_location(game.underCursor.hex);  
  register_event('HEXAGON_SELECTED', {hex: game.underCursor.hex});
  
  game.inventory.load();

  game.running = true;
  requestAnimationFrame(loop);
}

game_start();
