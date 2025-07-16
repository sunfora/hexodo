/**
 * Get mathematical remainder. a = r mod b, where b > r >= 0
 * @param {number} a - the number to divide
 * @param {number} m - the modulo
 * @returns {number} - remainder of division
 */
export function rem(a, m) {
  return ((a % m) + m) % m;
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
