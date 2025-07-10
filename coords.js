/**
 * struct HexOddQ(col: number, row: number)
 *
 * OddQ representation on a hex board
 * The hex grid oscilates sort of 
 */
export class HexOddQ {
  /**
   * @param {number} col
   * @param {number} row
   */
  constructor(col, row) {
    this.col = col;
    this.row = row;
  }

  /** 
   * Reuse the HexOddQ.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {HexOddQ} target 
   * 
   * @param {number} col
   * @param {number} row
   */
  static rec(target, col, row) {
    target.col = col;
    target.row = row;
    return target;
  }

  /** 
   * Reuse the HexOddQ or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?HexOddQ} target 
   *
   * @param {number} col
   * @param {number} row
   */
  static recOrNew(target, col, row) {
    return target instanceof HexOddQ
      ? HexOddQ.rec(target, col, row)
      : new HexOddQ(col, row);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?HexOddQ} first
   * @param {?HexOddQ} second 
   *
   * @param {number} col
   * @param {number} row
   */
  static equals(first, second) {
    return first  instanceof HexOddQ &&
           second instanceof HexOddQ &&
           first.col === second.col &&
           first.row === second.row
  }

  /** 
   * Compares two HexOddQ structs.
   * @param {HexOddQ} other 
   */
  equals(other) {
    return other instanceof HexOddQ &&
           this.col === other.col &&
           this.row === other.row;
  }

  /** 
   * Clones HexOddQ.
   */
  clone() {
    const col = this.col;
    const row = this.row
    return new HexOddQ(col, row);
  }

  /** 
   * Copies contents of this HexOddQ to other
   * @param {HexOddQ} other
   */
  copy(other) {
    const col = this.col;
    const row = this.row
    return HexOddQ.rec(other, col, row);
  }
}

/**
 * struct HexCube(q: number, r: number, s: number)
 * Cube representation on a hex board
 *
 * q + r + s = 0 plane cut
 */
export class HexCube {
  /**
   * @param {number} q
   * @param {number} r
   * @param {number} s
   */
  constructor(q, r, s) {
    this.q = q;
    this.r = r;
    this.s = s;
  }

  /** 
   * Reuse the HexCube.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {HexCube} target 
   * 
   * @param {number} q
   * @param {number} r
   * @param {number} s
   */
  static rec(target, q, r, s) {
    target.q = q;
    target.r = r;
    target.s = s;
    return target;
  }

  /** 
   * Reuse the HexCube or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?HexCube} target 
   *
   * @param {number} q
   * @param {number} r
   * @param {number} s
   */
  static recOrNew(target, q, r, s) {
    return target instanceof HexCube
      ? HexCube.rec(target, q, r, s)
      : new HexCube(q, r, s);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?HexCube} first
   * @param {?HexCube} second 
   *
   * @param {number} q
   * @param {number} r
   * @param {number} s
   */
  static equals(first, second) {
    return first  instanceof HexCube &&
           second instanceof HexCube &&
           first.q === second.q &&
           first.r === second.r &&
           first.s === second.s
  }

  /** 
   * Compares two HexCube structs.
   * @param {HexCube} other 
   */
  equals(other) {
    return other instanceof HexCube &&
           this.q === other.q &&
           this.r === other.r &&
           this.s === other.s;
  }

  /** 
   * Clones HexCube.
   */
  clone() {
    const q = this.q;
    const r = this.r;
    const s = this.s
    return new HexCube(q, r, s);
  }

  /** 
   * Copies contents of this HexCube to other
   * @param {HexCube} other
   */
  copy(other) {
    const q = this.q;
    const r = this.r;
    const s = this.s
    return HexCube.rec(other, q, r, s);
  }
}

/**
 * Transforms cube hex coordinates to oddq.
 * @param {HexCube}  hex - cube coords
 * @param {?HexOddQ} dest - oddq coords
 */
export function cube_to_oddq(hex, dest=null) {
  let col = hex.q;
  let row = hex.r + (hex.q - (hex.q&1)) / 2;
  return HexOddQ.recOrNew(dest, col, row);
}

/**
 * Transforms oddq hex coordinates to cube.
 * @param {HexOddQ} - oddq coords
 * @param {?HexCube} - cube coords
 */
export function oddq_to_cube(hex, dest=null) {
  let q = hex.col;
  let r = hex.row - (hex.col - (hex.col&1)) / 2;
  return HexCube.recOrNew(dest, q, r, -(q + r));
}


/**
 * Using hex cube coords find nearest cube with integer coords.
 * @param {HexCube} hex - floating point hex cube.
 * @param {?HexCube} dest - the result with integer coordinates.
 */
export function cube_round(hex, dest=null) {
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
  return HexCube.recOrNew(dest, q_i, r_i, s_i);
}


/**
 * struct Vec2(x: number, y: number)
 */
export class Vec2 {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /** 
   * Reuse the Vec2.
   * NOTE(ivan): unchecked, be sure it really is an object of proper type.
   * @param {Vec2} target 
   * 
   * @param {number} x
   * @param {number} y
   */
  static rec(target, x, y) {
    target.x = x;
    target.y = y;
    return target;
  }

  /** 
   * Reuse the Vec2 or new if target is wrong type.
   * USAGE(ivan): for object pooling and other gc lowerage
   *
   * @param {?Vec2} target 
   *
   * @param {number} x
   * @param {number} y
   */
  static recOrNew(target, x, y) {
    return target instanceof Vec2
      ? Vec2.rec(target, x, y)
      : new Vec2(x, y);
  }

  /** 
   * Compare two objects 
   * USAGE(ivan): typesafe comparasion 
   *
   * @param {?Vec2} first
   * @param {?Vec2} second 
   *
   * @param {number} x
   * @param {number} y
   */
  static equals(first, second) {
    return first  instanceof Vec2 &&
           second instanceof Vec2 &&
           first.x === second.x &&
           first.y === second.y
  }

  /** 
   * Compares two Vec2 structs.
   * @param {Vec2} other 
   */
  equals(other) {
    return other instanceof Vec2 &&
           this.x === other.x &&
           this.y === other.y;
  }

  /** 
   * Clones Vec2.
   */
  clone() {
    const x = this.x;
    const y = this.y
    return new Vec2(x, y);
  }

  /** 
   * Copies contents of this Vec2 to other
   * @param {Vec2} other
   */
  copy(other) {
    const x = this.x;
    const y = this.y
    return Vec2.rec(other, x, y);
  }
}

/**
 * Convert hex in qube/axial coordinates to cartesian logical coordinate space.
 * @param {HexCube} hex - hex in cubic coordinates
 * @param {?Vec2} - dest point in cartesian space [result is written there]
 */
export function cube_to_vec2(hex, dest=null) {
  // hex to cartesian
  let x = 3./2 * hex.q;
  let y = Math.sqrt(3)/2 * hex.q  +  Math.sqrt(3) * hex.r;
  return Vec2.recOrNew(dest, x, y);
}

/**
 * Turn cartesian coords to cubic hex.
 *
 * @param {number} x - x coord
 * @param {number} y - y coord
 * @param {?HexCube} dest - result in cube coords
 */
export function xy_to_cube(x, y, dest=null) {
  let q = 2 * x / 3;
  let r = -1./3 * x + Math.sqrt(3) / 3 * y;
  return HexCube.recOrNew(dest, q, r, -(q + r));
}

/**
 * Turn cartesian coords to cubic hex.
 *
 * @param {Vec2} vec - vector/point in cartesian coords
 * @param {?HexCube} dest - result in cube coords
 */
export function vec2_to_cube(vec, dest=null) {
  return xy_to_cube(vec.x, vec.y, dest);
}

/**
 * Convert hex in oddq coordinates to cartesian logical coordinate space.
 * @param {HexOddQ} hex - hex in cubic coordinates
 * @param {?Vec2} - dest point in cartesian space [result is written there]
 * @returns {Vec2} - point in cartesian coordinat space
 */
export function oddq_to_vec2(hex, dest=null) {
  // NOTE(ivan): inlined cube_to_vec2(oddq_to_cube(hex))

  // oddq_to_cube
  const q = hex.col;
  const r = hex.row - (hex.col - (hex.col&1)) / 2;

  // cube_to_vec2
  const x = 3./2 * q;
  const y = Math.sqrt(3)/2 * q  +  Math.sqrt(3) * r;

  return Vec2.recOrNew(dest, x, y);
}

/**
 * Using cartesian x, y round to nearest hex in oddq coordinates.
 * @param {number} x - x coordinate
 * @param {number} y - y coordinate
 * @param {?HexOddQ} dest - reuse 
 * @returns {HexOddQ} - nearest hex in oddq
 */
export function xy_nearest_oddq(x, y, dest=null) {
  // convert xy -> cube / axial
  let q = 2 * x / 3;
  let r = -1./3 * x + Math.sqrt(3) / 3 * y;
  let s = -(q + r);

  // round 
  let q_i = Math.round(q);
  let r_i = Math.round(r);
  let s_i = Math.round(s);

  let q_diff = Math.abs(q_i - q);
  let r_diff = Math.abs(r_i - r);
  let s_diff = Math.abs(s_i - s);

  if (q_diff > r_diff && q_diff > s_diff) {
    q_i = -(r_i + s_i);
  } else if (r_diff > s_diff) {
    r_i = -(q_i + s_i);
  }
  
  // convert to oddq
  let col = q_i;
  let row = r_i + (q_i - (q_i & 1)) / 2;

  return HexOddQ.recOrNew(dest, col, row);
}
