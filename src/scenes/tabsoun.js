import { clamp01, ramp, mix, smooth, play, stop } from "../util.js";

/* Scene 10. The panorama opens out of the crack scene 9 ended on. The camera
   drifts with the scroll; the hyrax clips follow the narration: they arrive
   when the hyrax is named and greeted with a camera, vanish into the stone at
   the alarm call, and come back as witnesses. */
export default function tabsoun(stage, s, ctx) {
  const scene = stage.querySelector("a-scene");
  const cam = stage.querySelector("a-camera");
  const clips = Array.from(stage.querySelectorAll(".hyrax"));
  const vids = clips.map((c) => c.querySelector("video"));

  /* story, in seconds of narration */
  const OPEN_AT = ctx.at(s, "open"), OPEN = 4; /* the crack widens into the view */
  const HYRAX = ctx.at(s, "hyrax"); /* the first clip, when it is named */
  const GLIMPSE = ctx.at(s, "glimpse"); /* the rest, "greet it with a camera" */
  const AT = [HYRAX, GLIMPSE, GLIMPSE + 1.5, GLIMPSE + 3, GLIMPSE + 4.5, GLIMPSE + 6]; /* same order as the HTML */
  const VANISH = ctx.at(s, "alarm") + 3.2; /* "...the others disappear into stone" */
  const BACK = ctx.at(s, "witness"); /* they return as witnesses */
  const FADE = 1.0;

  /* tactile, in scroll progress */
  const START = { yaw: 184.1, pitch: -35.8, fov: 30 };
  const END = { yaw: 184.1 - 43.2, pitch: 20, fov: 120 };
  const ZOOM_FROM = 0.03, ZOOM_TO = 0.28;
  const DRIFT = -40; /* degrees of turn */

  let last = -1;

  function pose(yaw, pitch, fov) {
    cam.setAttribute("rotation", { x: pitch, y: -yaw, z: 0 });
    cam.setAttribute("camera", "fov", fov);
  }

  window.addEventListener("resize", function () {
    last = -1;
  });

  return {
    update: function (p, fade, t) {
      stage.style.setProperty("--open", smooth(ramp(t, OPEN_AT, OPEN)).toFixed(4));

      const gone = ramp(t, VANISH, 0.35);
      clips.forEach(function (c, i) {
        const back = ramp(t, BACK + i * 0.6, 2);
        const a = ramp(t, AT[i], FADE) * (1 - gone * (1 - back));
        c.style.opacity = a;
        c.style.visibility = a > 0 ? "visible" : "hidden";

        /* only decode a video while it is on screen */
        if (s.active && a > 0) play(vids[i]);
        else stop(vids[i]);
      });

      /* panorama: only redraw when something has changed */
      if (!scene.renderStarted || p === last) return;
      last = p;

      const z = smooth(clamp01((p - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM)));
      pose(mix(START.yaw, END.yaw, z) + p * DRIFT, mix(START.pitch, END.pitch, z), mix(START.fov, END.fov, z));
      scene.render();
    },
    exit: function () {
      vids.forEach(stop);
    },
  };
}
