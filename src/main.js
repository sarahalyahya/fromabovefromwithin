/* From above, from within: the engine.

   Each <section class="scene"> is a tall block of scroll with a fixed,
   full-screen stage. Scroll position moves the cameras (tactile motion);
   the scene's voice is the clock for everything that tells the story
   (subtitles, reveals, clips). In Auto mode the page also scrolls itself
   to follow the voice. */

import { clamp01, ramp, film as playback, play } from "./util.js";
import { createHud } from "./hud.js";

import castle from "./scenes/castle.js";
import overlook from "./scenes/overlook.js";
import droneFootage from "./scenes/drone-footage.js";
import allAltitudes from "./scenes/all-altitudes.js";
import feed from "./scenes/feed.js";
import planet from "./scenes/planet.js";
import kylBingaman from "./scenes/kyl-bingaman.js";
import govmap from "./scenes/govmap.js";
import visibility from "./scenes/visibility.js";
import tabsoun from "./scenes/tabsoun.js";
import sh1982 from "./scenes/sh-1982.js";
import intoTheRock from "./scenes/into-the-rock.js";
import crosshairReturn from "./scenes/crosshair-return.js";

const BEHAVIOURS = {
  castle: castle,
  overlook: overlook,
  "drone-footage": droneFootage,
  "all-altitudes": allAltitudes,
  feed: feed,
  planet: planet,
  "kyl-bingaman": kylBingaman,
  govmap: govmap,
  visibility: visibility,
  tabsoun: tabsoun,
  "sh-1982": sh1982,
  "into-the-rock": intoTheRock,
  "crosshair-return": crosshairReturn,
};

history.scrollRestoration = "manual"; /* reload always starts at the top */
window.scrollTo(0, 0);
document.documentElement.classList.remove("no-js");

/* ---------- settings ---------- */

const params = new URLSearchParams(location.search);
const KIOSK = params.has("kiosk"); /* gallery install: reset when idle and after the end */
const IDLE = KIOSK ? 90 : 0; /* seconds with no input and no voice before a reset */
const END_RESET = KIOSK ? 60 : 0; /* seconds after the last line before a reset */
const RESTART_AT = 5; /* seconds after the last line before the end card shows */

const PACE = 0.36; /* screens of scroll per second of narration, the same in every scene */
const TAIL = 3; /* seconds of scroll after a voice ends; data-tail overrides */
const XFADE = 0.8; /* screens a crossfade between two scenes takes */
const MOUNT_MARGIN = 1.5; /* window heights either side of a scene where it is kept ready */
const VOICE_FADE = 0.6; /* seconds a departing voice takes to ramp out */
const VOICE_LEVEL = 0.5;
const AHEAD = 4; /* seconds the scroll may run ahead of the voice before "Wait" shows */
const NUDGE = 4; /* seconds of stillness after a voice ends before "Scroll" shows */

const WHEEL_SCALE = 0.85; /* how much of the trackpad's distance we use */
const MAX_SPEED = 4500; /* px per second: the fastest manual scroll can move */

const AUTO_EASE = 5; /* how tightly auto scroll follows the voice, per second */
const AUTO_MAX = 3; /* fastest auto scroll, in screens per second */

/* ---------- elements ---------- */

const filmEl = document.getElementById("film");
const stackView = document.getElementById("stack");
const stack = stackView.querySelector(".stack");
const stackLayers = Array.from(stackView.querySelectorAll(".layer"));
const guide = document.getElementById("guide");
const gate = document.getElementById("gate");
const autoBtn = document.getElementById("auto");
const pauseBtn = document.getElementById("pause");
const sayEl = document.getElementById("say");
const pace = document.getElementById("pace");
const end = document.getElementById("end");

/* ---------- the shared satellite stack ---------- */

const STACK_REST = { pull: 1, tilt: 79, turn: 0, spread: 1, lift: 15 };

function poseStack(pose) {
  stack.style.setProperty("--pull", pose.pull);
  stack.style.setProperty("--tilt", pose.tilt);
  stack.style.setProperty("--turn", pose.turn);
  stack.style.setProperty("--spread", pose.spread);
  stack.style.setProperty("--lift", pose.lift);
  stackLayers.forEach((l) => l.style.setProperty("--pop", 0));
}

/* ---------- the panorama (A-Frame), loaded after the page is up ---------- */

const pano = document.querySelector("a-scene");
if (pano) {
  /* we draw the panorama ourselves, only when its camera moves */
  pano.addEventListener("renderstart", () => pano.renderer.setAnimationLoop(null));
}
function loadAframe() {
  if (window.AFRAME || document.querySelector("script[data-aframe]")) return;
  const sc = document.createElement("script");
  sc.src = "assets/aframe.min.js";
  sc.dataset.aframe = "";
  document.head.appendChild(sc);
}
window.addEventListener("load", () => setTimeout(loadAframe, 600));

document.querySelectorAll("[data-volume]").forEach((el) => (el.volume = parseFloat(el.dataset.volume)));

/* ---------- scenes ---------- */

const SCENES = Array.from(filmEl.querySelectorAll(".scene")).map(function (el, index) {
  let stage = el.querySelector(".stage");
  if (!stage) {
    stage = document.createElement("div");
    stage.className = "stage";
    el.appendChild(stage);
  }
  return {
    el: el,
    stage: stage,
    index: index,
    id: el.dataset.scene || "",
    vo: stage.querySelector("audio.vo"),
    subs: Array.from(stage.querySelectorAll(".sub")),
    timed: !!stage.querySelector(".sub[data-t]"),
    dur: parseFloat(el.dataset.duration) || 0, /* replaced by the real length once the audio loads */
    tail: el.dataset.tail ? parseFloat(el.dataset.tail) : TAIL,
    screens: parseFloat(el.dataset.screens) || 3, /* only for a scene without a voice */
    in: el.dataset.in || "cross",
    stack: el.hasAttribute("data-stack"),
    behaviour: BEHAVIOURS[el.dataset.scene] || null,
    api: null,
    mounted: false,
    near: false,
    active: null, /* null so the first frame always writes */
    fade: -1,
    gain: 0, /* where the voice is in its ramp out */
    rewind: false, /* was the top the way out? */
    shown: null,
    post: 0, /* seconds since the voice ended, for the tail */
    retryAt: 0,
  };
});

/* What scenes get to know about the film. */
const ctx = {
  stackView: stackView,
  stack: stack,
  STACK_REST: STACK_REST,
  poseStack: poseStack,
  /* seconds into the narration of the subtitle that carries this mark */
  at: function (s, name, attr) {
    const key = attr || "mark";
    const el = s.subs.find((e) => (e.dataset[key] || "").split(/\s+/).includes(name));
    return el ? parseFloat(el.dataset.t) : Infinity;
  },
  sceneIndex: () => (currentScene ? currentScene.index : -1),
};

function warm(s) {
  if (!s) return;
  s.stage.querySelectorAll("audio, video").forEach((m) => {
    if (m.preload !== "auto") m.preload = "auto";
  });
  if (s.stack) stackView.querySelectorAll("video").forEach((m) => (m.preload = "auto"));
}

function mount(s) {
  if (s.mounted) return;
  s.mounted = true;
  warm(s);
  warm(SCENES[s.index + 1]); /* get the next scene's media coming too */
  let api = s.behaviour ? s.behaviour(s.stage, s, ctx) : {};
  if (typeof api === "function") api = { update: api };
  s.api = api || {};
}

/* ---------- timeline ---------- */

let filmLen = 0;
let VH = window.innerHeight;
let raw = 0;
let currentScene = null;
let launched = false;
let hud = null;

/* Every scene is (voice + tail) seconds long at one pace, converted to pixels
   here and redone on resize, so pacing means the same on a laptop and a kiosk. */
function buildTimeline() {
  VH = window.innerHeight;
  let acc = 0;
  SCENES.forEach(function (s) {
    s.T = s.dur ? s.dur + s.tail : s.screens / PACE;
    s.len = Math.max(1, Math.round(s.T * PACE * VH));
    s.start = acc;
    acc += s.len;
    s.el.style.height = s.len + "px";
  });
  filmLen = acc;
  if (hud) hud.layout();
}

/* measured from #film's own top rather than window.scrollY */
function readScroll() {
  raw = Math.max(0, Math.min(filmLen, -filmEl.getBoundingClientRect().top));
}

/* where a scene's own timeline starts: past the crossfade into it */
function entryOf(s) {
  return s.index > 0 && s.in !== "cut" ? (XFADE * VH) / 2 : 0;
}

/* the real voice lengths, once known */
SCENES.forEach(function (s) {
  if (!s.vo) return;
  function measured() {
    const d = s.vo.duration;
    if (!isFinite(d) || Math.abs(d - s.dur) < 0.25) return;
    s.dur = d;
    if (!launched) {
      buildTimeline();
      readScroll();
    }
  }
  if (s.vo.readyState >= 1) measured();
  s.vo.addEventListener("loadedmetadata", measured);
});

/* how visible a scene's stage is: crossfades centred on each boundary, or cuts */
function arrive(type, at, W) {
  if (type === "cut") return raw >= at ? 1 : 0;
  return ramp(raw, at - W / 2, W);
}
function fadeOf(i) {
  const s = SCENES[i];
  const W = XFADE * VH;
  const next = SCENES[i + 1];
  const vin = i === 0 ? 1 : arrive(s.in, s.start, W);
  const vout = next ? 1 - arrive(next.in, next.start, W) : 1 - ramp(raw, s.start + s.len - W, W);
  return vin * vout;
}

/* ---------- subtitles and cues ---------- */

function show(s, el) {
  if (el === s.shown) return;
  if (s.shown) s.shown.removeAttribute("data-on");
  if (el) el.setAttribute("data-on", "");
  s.shown = el;
}

/* the voice drives the subtitles: the last line whose data-t has passed */
function caption(s, t) {
  let now = null;
  for (let i = 0; i < s.subs.length; i++) {
    if (t >= parseFloat(s.subs[i].dataset.t)) now = s.subs[i];
  }
  show(s, now);
}

/* for a scene without timings, scroll drives them: line i holds from p = i/n to (i+1)/n */
function captionByScroll(s, p) {
  const n = s.subs.length;
  if (!n) return;
  show(s, s.subs[Math.max(0, Math.min(n - 1, Math.floor(p * n)))]);
}

/* subtitle lines with data-cue start a video (by id) when they are reached */
function cue(s) {
  const now = s.subs.indexOf(s.shown);
  s.subs.forEach(function (sub, i) {
    if (!sub.dataset.cue) return;
    const v = sub._cue || (sub._cue = document.getElementById(sub.dataset.cue));
    const on = now >= i;
    if (on === v.hasAttribute("data-on")) return;
    if (on) {
      v.setAttribute("data-on", "");
      v.currentTime = 0;
      play(v);
    } else {
      v.removeAttribute("data-on");
      v.pause();
    }
  });
}

/* seconds into the current scene's own timeline: its voice, then its tail */
function sceneClock(s) {
  if (!s) return 0;
  if (s.vo && !s.vo.ended) return s.vo.currentTime;
  return s.dur + s.post;
}

/* ---------- auto mode ---------- */

let auto = true;
try {
  auto = localStorage.getItem("fafw-auto") !== "0";
} catch (e) {}
let autoY = 0;

function setAuto(on, byInput) {
  auto = on;
  autoBtn.setAttribute("aria-pressed", String(on));
  document.body.toggleAttribute("data-auto", on);
  if (!launched) return;
  if (on) {
    autoY = window.scrollY;
    /* pick up from where you are: past the end of the voice, run on through the tail */
    const s = currentScene;
    if (s && s.vo && s.vo.ended) {
      const tHere = (raw - s.start) / (PACE * VH);
      s.post = Math.max(0, tHere - s.dur);
    }
    say("Auto on · the film follows the voice");
  } else {
    say(byInput ? "Auto off · the scroll is yours" : "Auto off · scroll at your own pace");
  }
}

/* Every scene runs at the same pace, so the page moves PACE screens per
   second of narration everywhere, and keeps moving through the tail and over
   the line into the next scene, whose voice then takes over without a jolt.
   Auto never scrolls back: if you are ahead of the voice, it waits. */
function autoStep(dt) {
  const s = currentScene || SCENES[0];
  let target = Math.min(s.start + PACE * VH * sceneClock(s), filmLen);
  target = Math.max(target, autoY);

  const max = AUTO_MAX * VH * dt;
  autoY += Math.min(max, (target - autoY) * (1 - Math.exp(-dt * AUTO_EASE)));

  const y = Math.round(autoY);
  if (Math.abs(window.scrollY - y) >= 1) {
    window.scrollTo({ top: y, behavior: "instant" });
    readScroll();
  }
}

/* ---------- pause ---------- */

let held = [];
function setPaused(on) {
  playback.paused = on;
  pauseBtn.setAttribute("aria-pressed", String(on));
  pauseBtn.dataset.label = on ? "Play" : "Pause";
  pauseBtn.setAttribute("aria-label", on ? "Play" : "Pause");
  document.body.toggleAttribute("data-paused", on);
  if (on) {
    held = Array.from(document.querySelectorAll("audio, video")).filter((m) => !m.paused);
    held.forEach((m) => m.pause());
  } else {
    held.forEach(play);
    held = [];
    SCENES.forEach((s) => (s.retryAt = 0));
  }
}

/* ---------- jumping between chapters ---------- */

function jumpTo(i) {
  i = Math.max(0, Math.min(SCENES.length - 1, i));
  /* everything from the target on starts fresh */
  SCENES.forEach(function (s) {
    if (s.index < i || !s.vo) return;
    s.vo.pause();
    s.vo.currentTime = 0;
    s.gain = 0;
    s.post = 0;
    s.retryAt = 0;
    caption(s, -1);
  });
  const s = SCENES[i];
  const y = s.start + entryOf(s);
  window.scrollTo({ top: y, behavior: "instant" });
  autoY = y;
  readScroll();
}

/* ---------- the frame loop ---------- */

const pending = { wheel: 0 };
let lastNow = 0;
let idleFor = 0;
let endFor = 0;
let still = 0;
let lastRaw = 0;

function frame(now) {
  const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.5) : 0;
  lastNow = now;

  if (auto && !playback.paused) autoStep(dt);

  let stackFade = 0;

  SCENES.forEach(function (s, i) {
    const p = (raw - s.start) / s.len;
    const local = clamp01(p);

    const near = raw > s.start - MOUNT_MARGIN * VH && raw < s.start + s.len + MOUNT_MARGIN * VH;
    if (near) mount(s);
    if (near !== s.near) {
      s.near = near;
      s.el.toggleAttribute("data-near", near);
      if (!near) {
        s.el.style.setProperty("--fade", "0");
        s.fade = 0;
      }
    }

    const fade = fadeOf(i);
    if (s.stack) stackFade += fade;
    if (near && Math.abs(fade - s.fade) > 0.0005) {
      s.el.style.setProperty("--fade", fade.toFixed(4));
      s.fade = fade;
    }

    const active = p >= 0 && p < 1;
    if (active !== s.active) {
      const first = s.active === null;
      s.active = active;
      s.el.dataset.active = active ? "true" : "false";

      if (s.vo) {
        if (active) {
          s.gain = 1; /* coming back cancels a ramp in progress */
          s.rewind = false;
          s.post = 0;
          s.vo.volume = VOICE_LEVEL;
          play(s.vo);
        } else if (!first) {
          /* out the top means you went back, so the voice starts over next time;
           out the bottom just parks it where it was */
          s.rewind = p < 0;
        }
      }
      if (s.api) {
        if (active && s.api.enter) s.api.enter();
        else if (!active && !first && s.api.exit) s.api.exit(p < 0 ? "up" : "down");
      }
      if (active) currentScene = s;
    }

    /* the active voice should be playing unless it has ended or the film is paused */
    if (s.vo && s.active && s.vo.paused && !s.vo.ended && !playback.paused && now > s.retryAt) {
      s.retryAt = now + 1000;
      play(s.vo);
    }
    if (s.vo && s.active && s.vo.ended && !playback.paused) s.post += dt;

    const t = s.vo ? s.vo.currentTime : 0;

    if (near) {
      if (s.timed) {
        if (s.vo && !s.vo.paused) caption(s, t);
      } else captionByScroll(s, local);
      cue(s);
    }

    /* ramp a departing voice down over VOICE_FADE, then park it */
    if (s.vo && !s.active && s.gain > 0) {
      s.gain = Math.max(0, s.gain - dt / VOICE_FADE);
      s.vo.volume = s.gain * VOICE_LEVEL;
      if (s.gain === 0) {
        s.vo.pause();
        if (s.rewind) {
          s.vo.currentTime = 0;
          caption(s, -1);
          cue(s);
          s.rewind = false;
        }
      }
    }

    if (s.mounted && s.api.always) s.api.always(t);
    if (near && s.api.update) s.api.update(local, fade, t);
  });

  stackFade = Math.min(1, stackFade);
  stackView.style.opacity = stackFade.toFixed(4);
  stackView.hidden = stackFade <= 0;

  /* kiosk: reset when nobody has been here for a while */
  const speaking = SCENES.some((s) => s.vo && !s.vo.paused);
  idleFor = speaking ? 0 : idleFor + dt;
  if (IDLE && idleFor > IDLE) location.reload();

  const final = SCENES[SCENES.length - 1];
  const over = currentScene === final && final.vo && final.vo.ended;
  endFor = over ? endFor + dt : 0;
  end.toggleAttribute("data-on", endFor > RESTART_AT);
  if (END_RESET && endFor > END_RESET) location.reload();

  const state = updatePace(dt);
  hud.update(currentScene, raw, sceneClock(currentScene), state === "scroll");

  requestAnimationFrame(frame);
}

/* the "Scroll" and "Wait" prompts, for manual scrolling only */
function updatePace(dt) {
  const s = currentScene;
  still = raw === lastRaw ? still + dt : 0;
  lastRaw = raw;

  let state = "";
  if (!auto && !playback.paused) {
    if (raw === 0 && still > 1.5) {
      state = "scroll";
    } else if (s && s.vo && isFinite(s.vo.duration)) {
      const scrolledTo = clamp01((raw - s.start) / s.len) * s.T;
      if (s.vo.ended && still > NUDGE && s !== SCENES[SCENES.length - 1]) state = "scroll";
      else if (!s.vo.ended && scrolledTo - s.vo.currentTime > AHEAD) state = "wait";
    }
  }
  pace.dataset.scene = s ? s.id : "";
  pace.dataset.state = state;
  return state;
}

/* ---------- input ---------- */

[
  "scroll",
  "wheel",
  "pointermove",
  "pointerdown",
  "touchstart",
  "keydown",
].forEach(function (ev) {
  window.addEventListener(ev, () => (idleFor = 0), { passive: true });
});

/* trackpads fling too fast: gather the wheel, then scroll at most MAX_SPEED each frame */
window.addEventListener(
  "wheel",
  function (e) {
    if (guide.open || e.ctrlKey) return; /* let the guide scroll; ctrlKey = pinch-zoom */
    e.preventDefault();
    if (!launched) return;
    if (auto) setAuto(false, true); /* touching the scroll takes it over */
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 16; /* some mice report lines */
    else if (e.deltaMode === 2) d *= innerHeight; /* or pages */
    pending.wheel += d * WHEEL_SCALE;
  },
  { passive: false },
);

let lastWheelT = 0;
function applyWheel(now) {
  const dt = lastWheelT ? Math.min((now - lastWheelT) / 1000, 0.1) : 0;
  lastWheelT = now;
  if (pending.wheel !== 0) {
    const max = MAX_SPEED * dt;
    window.scrollBy({ top: Math.max(-max, Math.min(max, pending.wheel)), behavior: "instant" });
    pending.wheel = 0; /* drop the excess, so no glide queues up */
  }
  requestAnimationFrame(applyWheel);
}
requestAnimationFrame(applyWheel);

window.addEventListener(
  "touchmove",
  function () {
    if (launched && auto) setAuto(false, true);
  },
  { passive: true },
);

window.addEventListener("keydown", function (e) {
  if (!launched || guide.open) return;
  const onButton = e.target && e.target.closest && e.target.closest("button");
  if (e.code === "Space" && !onButton) {
    e.preventDefault();
    setPaused(!playback.paused);
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    jumpTo((currentScene ? currentScene.index : 0) + 1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    jumpTo((currentScene ? currentScene.index : 0) - 1);
  } else if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(e.key) && auto) {
    setAuto(false, true);
  }
});

window.addEventListener("scroll", readScroll, { passive: true });

/* keep your place in the film when the window changes size */
let resizeTimer = 0;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    const s = currentScene;
    const p = s ? (raw - s.start) / s.len : 0;
    buildTimeline();
    if (s && launched) {
      const y = s.start + p * s.len;
      window.scrollTo({ top: y, behavior: "instant" });
      autoY = y;
    }
    readScroll();
  }, 120);
});

/* sources: tap to open on touch screens */
document.addEventListener("click", function (e) {
  const c = e.target.closest && e.target.closest(".credit");
  document.querySelectorAll(".credit[data-open]").forEach((x) => x !== c && x.removeAttribute("data-open"));
  if (c) c.toggleAttribute("data-open");
});

/* ---------- controls ---------- */

let sayTimer = 0;
function say(text) {
  sayEl.textContent = text;
  sayEl.setAttribute("data-on", "");
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => sayEl.removeAttribute("data-on"), 2600);
}

function onClick(el, fn) {
  el.addEventListener("click", function (e) {
    fn();
    if (e.detail > 0) el.blur(); /* a mouse click should not leave Space bound to the button */
  });
}

onClick(autoBtn, function () {
  setAuto(!auto, false);
  /* remember a choice made with the button (not a scroll takeover) for the next visit */
  try {
    localStorage.setItem("fafw-auto", auto ? "1" : "0");
  } catch (e) {}
});
onClick(pauseBtn, () => setPaused(!playback.paused));
onClick(document.getElementById("restart-corner"), () => location.reload());
onClick(document.getElementById("restart"), () => location.reload());
document.getElementById("how").addEventListener("click", () => guide.showModal());
guide.showModal(); /* open on arrival; the Instructions button reopens it */

document.getElementById("launch").addEventListener("click", function () {
  gate.hidden = true;
  launched = true;
  document.body.setAttribute("data-launched", "");
  window.scrollTo({ top: 0, behavior: "instant" });
  autoY = 0;
  buildTimeline();
  readScroll();
  loadAframe();
  requestAnimationFrame(frame);
  if (auto) say("Auto on · press Auto to scroll yourself");
});

/* the end card lists every source credited in the film */
(function () {
  const list = end.querySelector(".end-sources");
  const seen = new Set();
  document.querySelectorAll("#film .credit-detail, #stack .credit-detail").forEach(function (d) {
    const text = d.textContent.replace(/\s+/g, " ").trim().replace(/\.$/, "");
    if (!text || seen.has(text)) return;
    seen.add(text);
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
})();

/* ---------- start ---------- */

hud = createHud(SCENES, jumpTo);
setAuto(auto, false);
buildTimeline();
readScroll();

/* console: film.SCENES shows the measured timeline; film.jumpTo(n) jumps to a scene */
filmEl.SCENES = SCENES;
filmEl.jumpTo = jumpTo;
