import { mix, easeOut, smooth } from "../util.js";

/* Scene 1. The camera move is tactile (scroll); the slate is story (narration). */
export default function castle(stage, s, ctx) {
  const mv = stage.querySelector("model-viewer");
  const slate = stage.querySelector(".slate");
  const DATE_AT = ctx.at(s, "date");

  /* The move is in two parts. Up to HOLD we turn around the castle; after it
   the turn stops and we start lifting and pulling back. Scene 2 picks the
   camera up exactly where this leaves it. */
  const HOLD = 0.8;

  const SPIN_FROM = 100, SPIN_TO = 740; /* degrees around (y axis) */
  const PHI_FROM = 78, PHI_TO = 45; /* 90 is eye level, 0 is straight down */
  const R_FROM = 55, R_TO = 95; /* per cent of the framing distance */

  return {
    update: function (p, fade, t) {
      const spin = easeOut(Math.min(p / HOLD, 1));
      const lift = p < HOLD ? 0 : smooth((p - HOLD) / (1 - HOLD));

      mv.cameraOrbit =
        mix(SPIN_FROM, SPIN_TO, spin) + "deg " +
        mix(PHI_FROM, PHI_TO, lift) + "deg " +
        mix(R_FROM, R_TO, lift) + "%";

      if (slate) {
        slate.toggleAttribute("data-more", t >= DATE_AT);
        slate.toggleAttribute("data-gone", p > HOLD); /* leave the frame clean for the lift */
      }
    },
  };
}
