/* Small helpers shared by every scene. */

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const mix = (a, b, t) => a + (b - a) * t;

export const smooth = (t) => t * t * (3 - 2 * t); /* ease both ends */
export const easeOut = (t) => 1 - (1 - t) * (1 - t); /* slow into the stop */

/* 0 before `at`, 1 once `len` has passed */
export const ramp = (x, at, len) => clamp01((x - at) / len);

/* keys: [[x, value], …] sorted by x. Returns the value at x, eased between keys. */
export function track(keys, ease = smooth) {
  return function (x) {
    if (x <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [x1, v1] = keys[i];
      if (x <= x1) {
        const [x0, v0] = keys[i - 1];
        return v0 + (v1 - v0) * ease((x - x0) / (x1 - x0));
      }
    }
    return keys[keys.length - 1][1];
  };
}

/* Playback that respects the film's pause. Scenes call these instead of
   v.play() / v.pause() so pausing the film pauses everything. */
export const film = { paused: false };

export function play(m) {
  if (!film.paused && m.paused) m.play().catch(function () {});
}
export function stop(m) {
  if (!m.paused) m.pause();
}
