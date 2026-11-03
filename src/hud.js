import { track } from "./util.js";

/* The two quiet indicators: the altimeter on the left edge (where the film is
   looking from) and the chapter strip at the bottom (where you are; click to
   jump). They replace the Scroll and Voice bars. */

const ACTS = { I: "The lookout", II: "The view from above", III: "From within" };
const LEVELS = { orbit: 0, air: 1, summit: 2, ground: 3, rock: 4 };
const MOVE = 1.6; /* seconds the marker takes between levels */

/* "air@0 orbit@21.1" → a function from seconds of narration to a level (0 top, 4 bottom) */
function altitudeTrack(spec) {
  if (!spec || spec === "none") return null;
  const keys = spec.trim().split(/\s+/).map(function (part) {
    const [name, at] = part.split("@");
    return [parseFloat(at) || 0, LEVELS[name] ?? 2];
  });
  const k = [[0, keys[0][1]]];
  for (let i = 1; i < keys.length; i++) {
    k.push([keys[i][0], keys[i - 1][1]], [keys[i][0] + MOVE, keys[i][1]]);
  }
  return track(k);
}

export function createHud(scenes, onJump) {
  const alt = document.getElementById("alt");
  const chapters = document.getElementById("chapters");
  const trackEl = chapters.querySelector(".ch-track");
  const actLabel = chapters.querySelector(".ch-act");
  const nLabel = chapters.querySelector(".ch-n");
  const levelEls = Array.from(alt.querySelectorAll("li"));

  const segs = [];
  const groups = [];
  let group = null, groupAct = null;
  scenes.forEach(function (s, i) {
    s.altitude = altitudeTrack(s.el.dataset.alt);
    const act = s.el.dataset.act || "";
    if (act !== groupAct) {
      group = document.createElement("div");
      group.className = "ch-group";
      trackEl.appendChild(group);
      groups.push({ el: group, scenes: [] });
      groupAct = act;
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ch-seg";
    b.setAttribute("aria-label", "Chapter " + (i + 1) + ": " + (s.el.dataset.title || s.id));
    b.dataset.title = String(i + 1).padStart(2, "0") + "  " + (s.el.dataset.title || s.id);
    b.innerHTML = "<i></i>";
    b.addEventListener("click", function () {
      onJump(i);
    });
    group.appendChild(b);
    groups[groups.length - 1].scenes.push(s);
    segs.push({ el: b, fill: b.firstChild, last: -1 });
  });

  let lastScene = null;
  let level = 2;

  return {
    /* scene lengths changed (resize, real voice durations) */
    layout: function () {
      scenes.forEach((s, i) => (segs[i].el.style.flexGrow = s.len));
      groups.forEach((g) => (g.el.style.flex = g.scenes.reduce((a, s) => a + s.len, 0) + " 1 0"));
    },

    update: function (current, raw, t, waiting) {
      scenes.forEach(function (s, i) {
        const f = Math.max(0, Math.min(1, (raw - s.start) / s.len));
        if (Math.abs(f - segs[i].last) > 0.0005) {
          segs[i].fill.style.transform = "scaleX(" + f.toFixed(4) + ")";
          segs[i].last = f;
        }
      });

      if (current && current !== lastScene) {
        const i = scenes.indexOf(current);
        segs.forEach((g, j) => g.el.toggleAttribute("data-now", j === i));
        const act = current.el.dataset.act || "";
        actLabel.textContent = act ? act + " · " + (ACTS[act] || "") : "";
        nLabel.textContent = String(i + 1).padStart(2, "0") + " / " + String(scenes.length).padStart(2, "0") +
          "  " + (current.el.dataset.title || "");
        document.body.dataset.scene = current.id;
        lastScene = current;
      }

      /* altimeter: follow the scene's path; hold still and go hollow when the shutter is closed */
      const shut = !current || !current.altitude;
      if (!shut) level = current.altitude(t);
      alt.style.setProperty("--lv", level.toFixed(3));
      alt.toggleAttribute("data-shut", shut);
      alt.toggleAttribute("data-waiting", !!waiting);
      const near = Math.round(level);
      levelEls.forEach((li) => li.toggleAttribute("data-here", !shut && +li.dataset.level === near));
    },
  };
}
