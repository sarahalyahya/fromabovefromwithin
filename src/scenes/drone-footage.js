import { smooth, clamp01, play, stop } from "../util.js";

/* Scene 3. The satellite stack lives in the background (#stack) and is shared
   by scenes 3 to 8. Here it starts flat, showing the castle view and the two
   drone clips, then pulls back into a stack near the end. */
export default function droneFootage(stage, s, ctx) {
  const view = ctx.stackView;
  const intro = view.querySelector(".intro");
  const introWrap = view.querySelector(".tl-vid-wrapper");
  const quoteAt = s.subs.findIndex((el) => el.classList.contains("quote"));
  const goneAt = s.subs.findIndex((el) => el.hasAttribute("data-intro-out"));

  const FROM = 0.75, TO = 0.9; /* where the stack pulls back (scroll) */
  const END = ctx.STACK_REST;

  return {
    update: function (p, fade) {
      /* the castle view dims under the quotes and goes when the announcement starts */
      const now = s.subs.indexOf(s.shown);
      const state = now >= goneAt ? "gone" : now >= quoteAt ? "dim" : "";
      introWrap.dataset.state = state;
      if (state !== "gone" && fade > 0) play(intro);
      else stop(intro);

      const out = smooth(clamp01((p - FROM) / (TO - FROM)));
      ctx.poseStack({
        pull: out * END.pull,
        tilt: out * END.tilt,
        turn: out * END.turn,
        spread: out * END.spread,
        lift: out * END.lift,
      });
    },
    exit: function () {
      stop(intro);
    },
  };
}
