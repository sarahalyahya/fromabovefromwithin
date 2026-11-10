import { mix, smooth, ramp } from "../util.js";

/* Scene 2. Each beam lights when the narrator names its place (story, in
   seconds of narration); the camera settles into the outline with the scroll. */
export default function overlook(stage, s, ctx) {
  const ORDER = ["nabatieh", "beqaa", "galilee"]; /* the order they light */
  const RISE = 0.8; /* seconds a beam takes to come up */
  const LIT = 0.9; /* opacity of the newest direction */
  const DIM = 0.35; /* opacity once a later one has lit */

  const fans = ORDER.map(function (id) {
    return { el: stage.querySelector('[data-fan="' + id + '"]'), at: ctx.at(s, id) };
  });

  const mv = stage.querySelector("model-viewer");
  const box = stage.querySelector("#castle-box");

  /* Scene 1 left the camera at 370deg 45deg 95%, filling the stage. Over
   SETTLE we tilt to straight down and shrink the box the model lives in
   until it sits inside the outline. The box does the zooming out. */
  const SETTLE = 0.35;

  const BOX_FROM = { x: 0, y: 0, w: 1000, h: 1000 };
  const BOX_TO = { x: 324, y: 217, w: 327, h: 480 };

  const PHI_FROM = 45, PHI_TO = 3; /* 0 is straight down; 3 dodges the pole */
  const R_FROM = 95, R_TO = 121; /* dial this to fit the outline */
  const THETA_FROM = 370, THETA_TO = 336;
  let last = -1;

  return {
    update: function (p, fade, t) {
      for (let i = 0; i < fans.length; i++) {
        if (!fans[i].el) continue;
        const up = ramp(t, fans[i].at, RISE);
        /* the NEXT beam coming up is what dims this one */
        const next = fans[i + 1] ? ramp(t, fans[i + 1].at, RISE) : 0;
        fans[i].el.setAttribute("opacity", (up * (LIT - (LIT - DIM) * next)).toFixed(3));
      }

      const land = smooth(Math.min(p / SETTLE, 1));

      if (box) {
        box.setAttribute("x", mix(BOX_FROM.x, BOX_TO.x, land));
        box.setAttribute("y", mix(BOX_FROM.y, BOX_TO.y, land));
        box.setAttribute("width", mix(BOX_FROM.w, BOX_TO.w, land));
        box.setAttribute("height", mix(BOX_FROM.h, BOX_TO.h, land));
      }
      if (mv) {
        mv.cameraOrbit =
          mix(THETA_FROM, THETA_TO, land) + "deg " +
          mix(PHI_FROM, PHI_TO, land) + "deg " +
          mix(R_FROM, R_TO, land) + "%";
        if (last < 0 || Math.abs(p - last) > 0.02) mv.jumpCameraToGoal(); /* no spin after a jump */
      }
      last = p;
    },
  };
}
