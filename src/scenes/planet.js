import { smooth, clamp01 } from "../util.js";

/* Scene 6. The email comes out of the stack; each highlight draws on the line
   that names it. Once imagery is "withheld", the satellite layer of the stack
   goes dark and stays dark for the rest of the stack scenes. */
export default function planet(stage, s, ctx) {
  const layer = ctx.stackView.querySelector('[data-layer="planet"]');
  const email = layer.querySelector(".email");
  const hls = layer.querySelectorAll(".hl");
  const subs = s.subs;
  const outAt = subs.findIndex((el) => el.hasAttribute("data-email-out"));
  const at = Array.prototype.map.call(hls, function (h) {
    return subs.findIndex((el) => el.dataset.hl === h.dataset.hl);
  });
  const WITHHELD = ctx.at(s, "withheld", "hl");

  const IN = 0.1, OUT = 0.9; /* out by IN, starts going back at OUT */
  const LOAD = 0.15; /* how long it takes the email to load */

  return {
    /* runs every frame once mounted, so the dark layer is right wherever you jump to */
    always: function (t) {
      const now = ctx.sceneIndex();
      ctx.stack.toggleAttribute("data-withheld", now > s.index || (now === s.index && t >= WITHHELD));
    },
    update: function (p) {
      if (!s.active) return;
      ctx.poseStack(ctx.STACK_REST);
      layer.style.setProperty("--pop", smooth(clamp01(Math.min(p / IN, (1 - p) / (1 - OUT)))));

      email.style.setProperty("--load", clamp01((p - IN) / LOAD));

      /* light whichever highlight the current subtitle names */
      const now = subs.indexOf(s.shown);
      hls.forEach(function (h, i) {
        h.toggleAttribute("data-on", at[i] !== -1 && now >= at[i]);
      });
      email.toggleAttribute("data-out", outAt !== -1 && now >= outAt);
    },
  };
}
