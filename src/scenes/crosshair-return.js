import { clamp01, play, stop } from "../util.js";

/* Scene 13. The released footage plays until the cut to the body camera,
   holds on that frame, and fades out with the end of the scene. */
export default function crosshairReturn(stage, s, ctx) {
  const wrap = stage.querySelector(".crosshair-vid-wrapper");
  const v = wrap.querySelector("video");

  const SHOW = 0.03; /* fades in almost at once */
  const FRAME = 22; /* the frame to hold on, in seconds of video */
  const OUT = 0.93; /* then the held frame fades to black */
  const FADE = 0.04;

  return {
    update: function (p) {
      const a = clamp01((p - SHOW) / FADE) * (1 - clamp01((p - OUT) / FADE));
      wrap.style.opacity = a;
      wrap.style.visibility = a > 0 ? "visible" : "hidden";

      if (s.active && a > 0 && v.currentTime < FRAME) play(v);
      else stop(v);

      if (p < SHOW && v.currentTime !== 0) v.currentTime = 0; /* scrolled back before the clip: rewind */
    },
    exit: function () {
      stop(v);
    },
  };
}
