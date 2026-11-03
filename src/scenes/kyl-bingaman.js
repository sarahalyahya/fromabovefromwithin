import { smooth, clamp01, ramp } from "../util.js";

/* Scene 7. A 20 m square of ground. The drawing builds with the narration:
   the law and its dates, then a car and a tank as sharp imagery shows them,
   then the 2 m pixel and its grid, and finally the two vehicles dissolve into
   the same blocks of pixels, impossible to tell apart. */
export default function kylBingaman(stage, s, ctx) {
  const layer = ctx.stackView.querySelector('[data-layer="kyl"]');
  const cv = layer.querySelector(".gsd");
  const ctx2d = cv.getContext("2d");

  const IN = 0.1; /* the layer comes out by here (scroll) and stays out */

  const INK = "#e6e3dc";
  const GRID = "#6d6a63";
  const WEIGHT = 0.003; /* line weight, as a share of the drawing */
  const VIEW = 26; /* the 20 m plot plus margin, in metres */

  /* story cues, in seconds of narration, read from the subtitles */
  const CUES = {
    law: ctx.at(s, "law"), /* "Between 1997 and 2020, the Kyl-Bingaman Amendment" */
    vehicles: ctx.at(s, "vehicles"), /* "...high-resolution imagery" */
    pixel: ctx.at(s, "pixel"), /* "capped at 2 meters per pixel" */
    grid: ctx.at(s, "pixel") + 3, /* "...the ground distance each pixel represents" */
    cells: ctx.at(s, "cells"), /* "but not enough to reliably distinguish" */
    blend: ctx.at(s, "blend"), /* "between a car and a tank" */
  };
  const RISE = 1.0; /* seconds each part takes to fade in */
  const on = (t, at) => ramp(t, at, RISE);

  /* vehicle sizes in metres */
  const CAR = { x: 3, y: 8.1, w: 4.5, h: 1.8 };
  const HULL = { x: 10, y: 7.2, w: 7.5, h: 3.7 };
  const TURRET = { x: 11.8, y: 7.9, w: 3.6, h: 2.3 };
  const BARREL = { x: 15.4, y: 8.85, w: 4.1, h: 0.4 };
  const CELL = 2; /* metres per pixel */

  /* the part of the barrel outside the hull, so overlapping cells are not counted twice */
  const BARREL_OUT = {
    x: HULL.x + HULL.w,
    y: BARREL.y,
    w: BARREL.x + BARREL.w - (HULL.x + HULL.w),
    h: BARREL.h,
  };
  const FOOTPRINTS = [CAR, HULL, BARREL_OUT];

  /* share of the cell at (cx, cy) that rectangle r covers, 0 to 1 */
  function coverage(cx, cy, r) {
    const ox = Math.max(0, Math.min(cx + CELL, r.x + r.w) - Math.max(cx, r.x));
    const oy = Math.max(0, Math.min(cy + CELL, r.y + r.h) - Math.max(cy, r.y));
    return (ox * oy) / (CELL * CELL);
  }

  const CELLS = [];
  for (let y = 0; y < 20; y += CELL) {
    for (let x = 0; x < 20; x += CELL) {
      let a = 0;
      FOOTPRINTS.forEach((r) => (a += coverage(x, y, r)));
      if (a > 0) CELLS.push({ x: x, y: y, a: Math.min(a, 1) });
    }
  }

  let DPR, k, px, left, top, fontPx; /* set in resize, read in draw */
  let last = -1;

  function label(text, x, y) {
    /* x, y in metres; font size in real pixels */
    ctx2d.save();
    ctx2d.translate(x, y);
    ctx2d.scale(1 / k, 1 / k);
    ctx2d.fillText(text, 0, 0);
    ctx2d.restore();
  }

  function outline(r) {
    ctx2d.strokeRect(r.x, r.y, r.w, r.h);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = W * DPR;
    cv.height = H * DPR;

    const size = Math.min(W * 0.9, H * 0.68);
    k = size / VIEW; /* px per metre */
    px = Math.max(1.5, size * WEIGHT);
    left = (W - size) / 2;
    top = H * 0.06;
    fontPx = Math.max(12, size * 0.022);

    draw(Math.max(last, 0));
  }

  function draw(t) {
    const c = ctx2d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cv.width, cv.height);
    /* work in metres from the top left corner of the square */
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.translate(left + 3 * k, top + 3 * k);
    c.scale(k, k);

    c.font = fontPx + "px 'IBM Plex Mono', monospace";
    c.fillStyle = "#b8b3a8";
    c.textAlign = "center";

    /* the law, under the square */
    c.fillStyle = "#b8b3a8";
    c.globalAlpha = on(t, CUES.law);
    label("KYL–BINGAMAN AMENDMENT · US LAW · 1997–2020", 10, 21.9);
    c.globalAlpha = on(t, CUES.pixel);
    label("IMAGERY CAPPED AT 2 M PER PIXEL", 10, 23.0);

    /* the grid, a line every 2 m */
    c.globalAlpha = on(t, CUES.grid);
    c.strokeStyle = GRID;
    c.lineWidth = (px * 0.5) / k;
    c.beginPath();
    for (let m = 2; m < 20; m += 2) {
      c.moveTo(m, 0);
      c.lineTo(m, 20);
      c.moveTo(0, m);
      c.lineTo(20, m);
    }
    c.stroke();

    /* the square of land */
    c.globalAlpha = 1;
    label("20 m", 10, -0.8);
    c.strokeStyle = INK;
    c.lineWidth = px / k;
    c.strokeRect(0, 0, 20, 20);

    /* one 2 m pixel and its dimension line */
    c.globalAlpha = on(t, CUES.pixel);
    label("2 m", 9, 17.7);
    c.strokeRect(8, 14, 2, 2);
    c.beginPath();
    c.moveTo(8, 16.6);
    c.lineTo(8, 17);
    c.moveTo(8, 16.8);
    c.lineTo(10, 16.8);
    c.moveTo(10, 16.6);
    c.lineTo(10, 17);
    c.stroke();

    /* what the satellite would deliver */
    c.fillStyle = INK;
    CELLS.forEach(function (cell) {
      c.globalAlpha = on(t, CUES.cells) * cell.a;
      c.fillRect(cell.x, cell.y, CELL, CELL);
    });

    /* the car and the tank, sharp, until they are only pixels */
    c.globalAlpha = on(t, CUES.vehicles) * (1 - on(t, CUES.blend));
    c.strokeStyle = INK;
    c.lineWidth = px / k;
    outline(CAR);
    outline(HULL);
    outline(TURRET);
    outline(BARREL);
    c.fillStyle = "#b8b3a8";
    label("CAR", CAR.x + CAR.w / 2, CAR.y - 0.7);
    label("TANK", HULL.x + HULL.w / 2, HULL.y - 0.7);
  }

  resize();
  window.addEventListener("resize", resize);
  document.fonts.ready.then(resize); /* redraw once the font has loaded */

  return {
    update: function (p, fade, t) {
      if (!s.active) return;
      ctx.poseStack(ctx.STACK_REST);
      layer.style.setProperty("--pop", smooth(clamp01(p / IN)));
      if (t !== last) {
        draw(t);
        last = t;
      }
    },
  };
}
