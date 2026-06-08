/**
 * Get mathematical remainder. a = r mod b, where b > r >= 0
 * @param {number} a - the number to divide
 * @param {number} m - the modulo
 * @returns {number} - remainder of division
 */
export function rem(a, m) {
  const r = a % m;
  return (r < 0)? r + m : r;
}

/**
 * Get mathematical remainder. a = r mod b, where b > r >= 0
 * @param {number} a - the number to divide
 * @param {number} m - the modulo === 2^p
 * @returns {number} - remainder of division
 */
export function rem_power_base2(a, m) {
  return a & (m - 1);
}

/**
 * Function to linearly interpolate between two values
 * @param   {number} start - starting point
 * @param   {number} end   - the end point
 * @param   {number} t     - t ∈ [0,1], the percentage
 * @returns {number}       - the linearly interpolated value 
 */
export function lerp(start, end, t) {
  return start + t * (end - start);
}

/**
 * Return value if it is in the range between min_value and max_value.
 * @param {number} min_value
 * @param {number} value
 * @param {number} max_value
 */
export function clamp(min_value, value, max_value) {
  return Math.min(Math.max(min_value, value), max_value);
}
