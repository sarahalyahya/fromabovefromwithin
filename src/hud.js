/* The chapter strip at the bottom: where you are in the film, one segment per
   scene grouped by act; click a segment to jump there. It replaces the
   Scroll and Voice bars. */

const ACTS = { I: "The lookout", II: "The view from above", III: "From within" };

export function createHud(scenes, onJump) {
  const chapters = document.getElementById("chapters");
  const trackEl = chapters.querySelector(".ch-track");
  const actLabel = chapters.querySelector(".ch-act");
  const nLabel = chapters.querySelector(".ch-n");

  const segs = [];
  const groups = [];
  let group = null, groupAct = null;
  scenes.forEach(function (s, i) {
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
    b.addEventListener("click", function (e) {
      onJump(i);
      if (e.detail > 0) b.blur(); /* after a mouse click, Space should pause, not click again */
    });
    group.appendChild(b);
    groups[groups.length - 1].scenes.push(s);
    segs.push({ el: b, fill: b.firstChild, last: -1 });
  });

  let lastScene = null;

  return {
    /* scene lengths changed (resize, real voice durations) */
    layout: function () {
      scenes.forEach((s, i) => (segs[i].el.style.flexGrow = s.len));
      groups.forEach((g) => (g.el.style.flex = g.scenes.reduce((a, s) => a + s.len, 0) + " 1 0"));
    },

    update: function (current, raw) {
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
    },
  };
}
