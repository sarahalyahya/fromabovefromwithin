/* Scene 4. The stack sways with the scroll. */
export default function allAltitudes(stage, s, ctx) {
  const R = ctx.STACK_REST;
  const SWAY = 6;
  const CYCLES = 2;

  return {
    update: function (p) {
      if (!s.active) return;
      const w = Math.sin(p * CYCLES * 2 * Math.PI);
      ctx.poseStack({ pull: R.pull, tilt: R.tilt, turn: R.turn + w * SWAY, spread: R.spread, lift: R.lift });
    },
  };
}
