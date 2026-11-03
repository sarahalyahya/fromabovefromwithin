import { smooth, clamp01 } from "../util.js";

/* Scene 5. The feed layer comes out of the stack and scrolls with you. */
export default function feed(stage, s, ctx) {
  const layer = ctx.stackView.querySelector('[data-layer="feed"]');
  const strip = layer.querySelector(".feed-strip");
  const posts = strip.querySelectorAll(".post").length;
  const IN = 0.15, OUT = 0.85; /* out by IN, starts going back at OUT */

  return {
    update: function (p) {
      if (!s.active) return;
      ctx.poseStack(ctx.STACK_REST);

      /* how far out the layer is */
      layer.style.setProperty("--pop", smooth(clamp01(Math.min(p / IN, (1 - p) / (1 - OUT)))));

      /* how far through the feed we are, only while the layer is fully out */
      strip.style.setProperty("--scroll", clamp01((p - IN) / (OUT - IN)) * (posts - 1));
    },
  };
}
