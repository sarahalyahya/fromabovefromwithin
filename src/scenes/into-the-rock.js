import { ramp, play, stop } from "../util.js";

/* Scene 12. The digging footage, until "No image from above can resolve that". */
export default function intoTheRock(stage, s, ctx) {
  const wrap = stage.querySelector(".digging-vid-wrapper");
  const v = wrap.querySelector("video");

  const SHOW = 0.3, OUT = ctx.at(s, "out"), FADE = 1.2; /* seconds of narration */

  return {
    update: function (p, fade, t) {
      const a = ramp(t, SHOW, FADE) * (1 - ramp(t, OUT, FADE));
      wrap.style.opacity = a;
      wrap.style.visibility = a > 0 ? "visible" : "hidden";

      if (s.active && a > 0) play(v);
      else stop(v);
    },
    exit: function () {
      stop(v);
    },
  };
}
