const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Frame-rate independent exponential smoothing (a "spring" without the math). */
export const damp = (a, b, smoothing, dt) => lerp(a, b, 1 - Math.pow(smoothing, dt));

/**
 * Yaw angle whose forward vector is (dx, dz).
 *
 * Convention used everywhere in this project: an Object3D with rotation.y = yaw
 * points its local -Z down (dx, dz). Rotating by yaw sends (0,0,-1) to
 * (-sin yaw, 0, -cos yaw), so yaw = atan2(-dx, -dz).
 */
export const yawFromDirection = (dx, dz) => Math.atan2(-dx, -dz);

/** Shortest signed angle from a to b, in [-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/** Smoothly rotate `from` toward `to` without spinning the long way round. */
export function dampAngle(from, to, smoothing, dt) {
  return from + angleDelta(from, to) * (1 - Math.pow(smoothing, dt));
}

/** Squared distance from point p to segment ab, in the XZ plane. */
export function distSqPointSegmentXZ(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  let t = lenSq > 0 ? ((px - ax) * abx + (pz - az) * abz) / lenSq : 0;
  t = clamp(t, 0, 1);
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
}

/** Unit forward vector for a yaw angle (inverse of yawFromDirection). */
export const directionFromYaw = (yaw) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });
