import { track } from "../util.js";

/* Scene 9. The last pixel of GovMap hangs in the dark. It narrows as the
   narration asks who decides how much we see, closes to a point with the
   shutter, and on the final question splits into a crack of light that
   scene 10 opens from. */
export default function visibility(stage, s, ctx) {
  const px = stage.querySelector(".last-pixel");
  const SHRINK = ctx.at(s, "shrink");
  const SHUTTER = ctx.at(s, "shutter");
  const CRACK = ctx.at(s, "crack");

  const size = track([
    [SHRINK, 1],
    [SHRINK + 2.5, 0.5],
    [SHUTTER, 0.5],
    [SHUTTER + 3, 0.035],
  ]);
  const crack = track([
    [CRACK + 0.6, 0],
    [CRACK + 3.2, 1],
  ]);

  return {
    update: function (p, fade, t) {
      px.style.setProperty("--size", size(t).toFixed(4));
      px.style.setProperty("--crack", crack(t).toFixed(4));
    },
  };
}
