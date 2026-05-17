/**
 * Simple lightweight utility class for managing object pools.
 * Usage: mostly to reuse events and other objects.
 *
 * NOTE(ivan): why not a class which I would then new Pool() blah blah blah.
 *             Well... this thing is a flat thing specifically for EventBus.
 *             And it is kinda simple stupid and good for cache.
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
