import { ramp } from "../util.js";

/* Scene 8. The aerial image resolves from 8 m pixels to full detail as the
   narrator describes it, is "re-blurred", then flattens to a single colour:
   the last pixel, which scene 9 carries on. */
export default function govmap(stage, s, ctx) {
  const layer = ctx.stackView.querySelector('[data-layer="kyl"]');
  const box = layer.querySelector(".govmap");
  const kylCv = layer.querySelector("canvas.gsd");
  const flat = box.querySelector(".gm-flat");
  const labels = box.querySelectorAll(".gm-label, .gm-place");
  const levels = Array.from(box.querySelectorAll("img[data-res]")).reverse(); /* 8 m first */
  const n = levels.length;

  /* story, in seconds of narration */
  const SHOW = 1.2; /* the image fades in over the cells */
  const CLEAR_FROM = ctx.at(s, "clear"); /* pixels → full detail ... */
  const CLEAR_TO = ctx.at(s, "sharp"); /* ... by "13 cm per pixel" */
  const BLUR_AT = ctx.at(s, "reblur"); /* "re-blurred" */
  const BLUR = 1.2;
  const FLAT_AT = BLUR_AT + 2.6; /* then down to one pixel */
  const FLAT = 1.6;
  const STEP = (CLEAR_TO - CLEAR_FROM) / n;

  averageColour(levels[0]);

  return {
    update: function (p, fade, t) {
      if (!s.active) return;
      ctx.poseStack(ctx.STACK_REST);
      layer.style.setProperty("--pop", 1);

      const show = ramp(t, 0, SHOW);
      box.style.opacity = show;
      kylCv.style.opacity = 1 - show;

      levels.forEach(function (img, i) {
        const clear = 1 - ramp(t, CLEAR_FROM + i * STEP, STEP);
        const back = i === 0 ? ramp(t, BLUR_AT, BLUR) : 0;
        img.style.opacity = Math.max(clear, back);
      });

      const f = ramp(t, FLAT_AT, FLAT);
      flat.style.opacity = f;
      labels.forEach((l) => (l.style.opacity = 1 - f));
    },
    exit: function (dir) {
      /* only reset when going back up; going on, the last frame fades into scene 9 */
      if (dir !== "up") return;
      box.style.opacity = 0;
      kylCv.style.opacity = "";
    },
  };
}

/* The mean colour of the coarsest image, used for the last pixel here and in scene 9. */
function averageColour(img) {
  function read() {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      document.documentElement.style.setProperty("--last-pixel", "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")");
    } catch (e) {
      /* keep the fallback colour from style.css */
    }
  }
  if (img.complete && img.naturalWidth) read();
  else img.addEventListener("load", read, { once: true });
}
