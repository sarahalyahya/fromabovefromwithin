import { ramp, smooth } from "../util.js";

/* Scene 11. The 1982 press photograph appears with Sharon's name, and the
   zoom into the crevice follows the narration: from the wounded guardian in
   the rubble to the hyrax that might lie in the rock, "invisible yet seeing".
   A slight drift stays on the scroll so it still moves under your hand. */
export default function sh1982(stage, s, ctx) {
  const wrap = stage.querySelector(".sh-img-wrapper");
  const img = wrap.querySelector(".sh-img");

  const SHOW = ctx.at(s, "photo"), FADE = 1.2;
  const ZOOM_FROM = ctx.at(s, "zoom"), ZOOM_TO = ctx.at(s, "seeing");
  const MAX = 8; /* how far in we go */

  return {
    update: function (p, fade, t) {
      const a = ramp(t, SHOW, FADE);
      wrap.style.opacity = a;
      wrap.style.visibility = a > 0 ? "visible" : "hidden";

      const z = smooth(ramp(t, ZOOM_FROM, ZOOM_TO - ZOOM_FROM));
      img.style.setProperty("--zoom", (Math.pow(MAX, z) * (1 + 0.06 * p)).toFixed(4));
    },
  };
}
