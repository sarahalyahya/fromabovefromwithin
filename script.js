(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  const gate = document.getElementById("gate");
  document.getElementById("launch").addEventListener("click", function () {
    gate.hidden = true;

    window.scrollTo({ top: 0, behavior: "instant" });

    buildTimeline();
    readScroll();
    requestAnimationFrame(render);
  });

  const STACK_REST = { pull: 1, tilt: 79, turn: 0, spread: 1, lift: 15 };

  function poseStack(pose) {
    const stack = stackView.querySelector(".stack");
    stack.style.setProperty("--pull", pose.pull);
    stack.style.setProperty("--tilt", pose.tilt);
    stack.style.setProperty("--turn", pose.turn);
    stack.style.setProperty("--spread", pose.spread);
    stack.style.setProperty("--lift", pose.lift);
    stackView.querySelectorAll(".layer").forEach(function (l) {
      l.style.setProperty("--pop", 0);
    });
  }

  const pano = document.querySelector("a-scene");
  function stopPanoLoop() {
    pano.renderer.setAnimationLoop(null);
  }
  if (pano) {
    if (pano.renderStarted)
      stopPanoLoop(); // already started before this ran
    else pano.addEventListener("renderstart", stopPanoLoop);
  }

  const BEHAVIOURS = {
    /*  example 

  opening: function(stage){
    const img = stage.querySelector('img');
    const vo  = new Audio('assets/audio/01.m4a');
    vo.preload = 'auto';
    return {
      update: function(p){ img.style.transform = 'scale(' + (1 + p*0.06) + ')'; },
      enter:  function(){ vo.play().catch(function(){}); },
      exit:   function(){ vo.pause(); vo.currentTime = 0; }
    };
  }

  */

    castle: function (stage) {
      const mv = stage.querySelector("model-viewer");
      // mv.cameraOrbit = (p*90) + 'deg 75deg 55%'

      /* The move is in two parts. Up to HOLD we turn around the castle; after it
       the turn stops and we start lifting and pulling back. The scene fades out
       part way through that climb, and scene 2 picks it up from there. */
      const HOLD = 0.8;

      const SPIN_FROM = 100,
        SPIN_TO = 740; /* degrees around (y axis) */
      const PHI_FROM = 78,
        PHI_TO = 45; /* 90 is eye level, 0 is straight down */
      const R_FROM = 55,
        R_TO = 95; /* per cent of the framing distance */

      function mix(a, b, t) {
        return a + (b - a) * t;
      }
      function easeOut(t) {
        return 1 - (1 - t) * (1 - t);
      } /* slow into the stop */
      function smooth(t) {
        return t * t * (3 - 2 * t);
      } /* ease both ends */

      return {
        update: function (p) {
          const spin = easeOut(Math.min(p / HOLD, 1));
          const lift = p < HOLD ? 0 : smooth((p - HOLD) / (1 - HOLD));

          mv.cameraOrbit =
            mix(SPIN_FROM, SPIN_TO, spin) +
            "deg " +
            mix(PHI_FROM, PHI_TO, lift) +
            "deg " +
            mix(R_FROM, R_TO, lift) +
            "%";
        },
      };
    },

    overlook: function (stage) {
      /* one row per direction, in the order they light. p is where the fan
       starts coming up, will retime based on vo l8r */
      const CUES = [
        { fan: "nabatieh", p: 0.42 },
        { fan: "beqaa", p: 0.66 },
        { fan: "galilee", p: 0.84 },
      ];

      const RISE = 0.05; /* progress a fan takes to come up */
      const LIT = 0.9; /* opacity of the newest direction */
      const DIM = 0.35; /* opacity once a later one has lit */

      const fans = CUES.map(function (c) {
        return stage.querySelector('[data-fan="' + c.fan + '"]');
      });

      function ramp(p, at) {
        /* 0 before at, 1 once RISE has passed */
        const k = (p - at) / RISE;
        return k < 0 ? 0 : k > 1 ? 1 : k;
      }

      const mv = stage.querySelector("model-viewer");
      const box = stage.querySelector("#castle-box");

      /* Scene 1 left the camera at 370deg 45deg 95%, filling the stage. Over
       SETTLE we tilt to straight down and shrink the box the model lives in
       until it sits inside the outline. The box does the zooming out. */
      const SETTLE = 0.35;

      const BOX_FROM = { x: 0, y: 0, w: 1000, h: 1000 };
      const BOX_TO = { x: 324, y: 217, w: 327, h: 480 };

      const PHI_FROM = 45,
        PHI_TO = 3; /* 0 is straight down; 3 dodges the pole */
      const R_FROM = 95,
        R_TO = 121; /* dial this to fit the outline */
      const THETA_FROM = 370,
        THETA_TO = 336;

      function mix(a, b, t) {
        return a + (b - a) * t;
      }
      function smooth(t) {
        return t * t * (3 - 2 * t);
      }

      return {
        update: function (p) {
          for (let i = 0; i < CUES.length; i++) {
            if (!fans[i]) continue;
            const up = ramp(p, CUES[i].p);
            /* the NEXT cue coming up is what dims this one */
            const next = CUES[i + 1] ? ramp(p, CUES[i + 1].p) : 0;
            fans[i].setAttribute(
              "opacity",
              (up * (LIT - (LIT - DIM) * next)).toFixed(3),
            );
          }

          const land = smooth(Math.min(p / SETTLE, 1));

          if (box) {
            box.setAttribute("x", mix(BOX_FROM.x, BOX_TO.x, land));
            box.setAttribute("y", mix(BOX_FROM.y, BOX_TO.y, land));
            box.setAttribute("width", mix(BOX_FROM.w, BOX_TO.w, land));
            box.setAttribute("height", mix(BOX_FROM.h, BOX_TO.h, land));
          }
          if (mv)
            mv.cameraOrbit =
              mix(THETA_FROM, THETA_TO, land) +
              "deg " +
              mix(PHI_FROM, PHI_TO, land) +
              "deg " +
              mix(R_FROM, R_TO, land) +
              "%";
        },
      };
    },

    //this is for repeating stack
    //   'drone-footage': function(stage){
    //   const stack = stage.querySelector('.stack');

    // //  where the zoom out starts
    //   const FROM = 0.75, TO = 0.9;

    //   /* where the stack ends up visually */
    //   // const END = { pull: 1.1, tilt: -10, turn: -54, spread: 1 };

    //     const END = { pull: 1, tilt: 65, turn: 0, spread: 1 };

    //   function smooth(t){ return t * t * (3 - 2 * t); }

    //   return {
    //     update: function(p){
    //       const k = (p - FROM) / (TO - FROM);
    //       const out = smooth(k < 0 ? 0 : k > 1 ? 1 : k);
    //       stack.style.setProperty('--pull',   out * END.pull);
    //       stack.style.setProperty('--tilt',   out * END.tilt);
    //       stack.style.setProperty('--turn',   out * END.turn);
    //       stack.style.setProperty('--spread', out * END.spread);
    //     }
    //   };
    // }

    //this is for one stack hidden in the bg:

    "drone-footage": function (stage, s) {
      const view = stackView;
      const stack = view.querySelector(".stack");

      const FROM = 0.75,
        TO = 0.9;
      const END = STACK_REST;

      function smooth(t) {
        return t * t * (3 - 2 * t);
      }

      return {
        update: function (p, fade) {
          if (!s.active) return;
          view.style.opacity = p < 0.5 ? fade : 1;

          const k = (p - FROM) / (TO - FROM);
          const out = smooth(k < 0 ? 0 : k > 1 ? 1 : k);
          // stack.style.setProperty('--pull',   out * END.pull);
          // stack.style.setProperty('--tilt',   out * END.tilt);
          // stack.style.setProperty('--turn',   out * END.turn);
          // stack.style.setProperty('--spread', out * END.spread);
          // stack.style.setProperty('--lift', out * END.lift);

          poseStack({
            pull: out * END.pull,
            tilt: out * END.tilt,
            turn: out * END.turn,
            spread: out * END.spread,
            lift: out * END.lift,
          });
        },
      };
    },

    "all-altitudes": function (stage, s) {
      const stack = stackView.querySelector(".stack");
      const SWAY = 6;
      const CYCLES = 2;

      return {
        update: function (p) {
          if (!s.active) return;
          const w = Math.sin(p * CYCLES * 2 * Math.PI);
          stackView.style.opacity = 1;
          poseStack({
            pull: STACK_REST.pull,
            tilt: STACK_REST.tilt,
            turn: STACK_REST.turn + w * SWAY,
            spread: STACK_REST.spread,
            lift: STACK_REST.lift,
          });
        },
      };
    },

    feed: function (stage, s) {
      const layer = stackView.querySelector('[data-layer="feed"]');
      const strip = layer.querySelector(".feed-strip");
      const posts = strip.querySelectorAll(".post").length;
      const IN = 0.15,
        OUT = 0.85; /* out by IN, starts going back at OUT */

      function smooth(t) {
        return t * t * (3 - 2 * t);
      }

      return {
        update: function (p) {
          if (!s.active) return;
          stackView.style.opacity = 1;
          poseStack(STACK_REST);

          /* how far out the layer is */
          let t = Math.min(p / IN, (1 - p) / (1 - OUT));
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          layer.style.setProperty("--pop", smooth(t));

          /* how far through the feed we are, only while the layer is fully out */
          let q = (p - IN) / (OUT - IN);
          q = q < 0 ? 0 : q > 1 ? 1 : q;
          strip.style.setProperty("--scroll", q * (posts - 1));
        },
      };
    },

    planet: function (stage, s) {
      const layer = stackView.querySelector('[data-layer="planet"]');
      const email = layer.querySelector(".email");
      const hls = layer.querySelectorAll(".hl");
      const subs = s.subs;
      const outAt = subs.findIndex(function (el) {
        return el.hasAttribute("data-email-out");
      });
      const at = Array.prototype.map.call(hls, function (h) {
        return subs.findIndex(function (el) {
          return el.dataset.hl === h.dataset.hl;
        });
      });
      const IN = 0.1,
        OUT = 0.9; /* out by IN, starts going back at OUT */
      const LOAD = 0.15; //how long it takes email 2 load

      function smooth(t) {
        return t * t * (3 - 2 * t);
      }
      function clamp01(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
      }

      return {
        update: function (p) {
          if (!s.active) return;
          stackView.style.opacity = 1;
          poseStack(STACK_REST);
          layer.style.setProperty(
            "--pop",
            smooth(clamp01(Math.min(p / IN, (1 - p) / (1 - OUT)))),
          );

          // load email in once the layer is out
          email.style.setProperty("--load", clamp01((p - IN) / LOAD));

          // light whichever highlight the current subtitle names */
          const now = subs.indexOf(s.shown); //which sub r we on
          hls.forEach(function (h, i) {
            if (at[i] !== -1 && now >= at[i]) {
              h.setAttribute("data-on", "");
            } else {
              h.removeAttribute("data-on");
            }
          });
          if (outAt !== -1 && now >= outAt) {
            email.setAttribute("data-out", "");
          } else {
            email.removeAttribute("data-out");
          }
        },
      };
    },

    "kyl-bingaman": function (stage, s) {
      const layer = stackView.querySelector('[data-layer="kyl"]');
      const cv = layer.querySelector(".gsd"); //my cnavas
      const ctx = cv.getContext("2d"); //the canvas drawing context, kinda like the p5.js canvas u need to keep referencing it

      const IN = 0.1,
        OUT = 1; //making it one so the layer doesnt zoom back out

      //stylistic stuff i wanna use for canvas
      const INK = "#e6e3dc";
      const GRID = "#6d6a63"; //grid color
      const WEIGHT = 0.003; //0.003 of the drawing itself
      const VIEW = 26; //this is the plot, which is 20m and then the rest is margin

      const CUES = { pixel: 0.5, grid: 0.58, vehicles: 0.67, cells: 0.83 }; //when things start happening in the scene, consdier how to retime to vo later
      const RISE = 0.05; //how much scroll is needed for fading

      //vehicle sizes in m
      const CAR = { x: 3, y: 8.1, w: 4.5, h: 1.8 };
      const HULL = { x: 10, y: 7.2, w: 7.5, h: 3.7 };
      const TURRET = { x: 11.8, y: 7.9, w: 3.6, h: 2.3 };
      const BARREL = { x: 15.4, y: 8.85, w: 4.1, h: 0.4 };
      const CELL = 2; //how many meters per 1 px

      //which parts of the vehicles acc need cells (bc there r overlaps)

      const BARREL_OUT = {
        x: HULL.x + HULL.w, // starts where the hull ends
        y: BARREL.y,
        w: BARREL.x + BARREL.w - (HULL.x + HULL.w),
        h: BARREL.h,
      };

      const FOOTPRINTS = [CAR, HULL, BARREL_OUT];

      //helpers
      // remember these r for refining the t-value
      function smooth(t) {
        return t * t * (3 - 2 * t);
      }
      function clamp01(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
      }
      function ramp(p, at) {
        return clamp01((p - at) / RISE);
      } // 0 before `at`, 1 once RISE has passed

      function label(text, x, y) {
        // x, y in metres
        ctx.save(); // remember the metre setup
        ctx.translate(x, y); // go to the spot
        ctx.scale(1 / k, 1 / k); // undo the metre scale: back to pixels
        ctx.fillText(text, 0, 0); // so the font size is real pixels
        ctx.restore(); // back to metres
      }

      function outline(r) {
        ctx.strokeRect(r.x, r.y, r.w, r.h); //with r being whichever one of the vehicles it is
      }

      // share of the cell at (cx, cy) that rectangle r covers, 0 to 1
      function coverage(cx, cy, r) {
        const ox = Math.max(
          0,
          Math.min(cx + CELL, r.x + r.w) - Math.max(cx, r.x),
        );
        const oy = Math.max(
          0,
          Math.min(cy + CELL, r.y + r.h) - Math.max(cy, r.y),
        );
        return (ox * oy) / (CELL * CELL);
      }

      const CELLS = [];
      // each row
      for (let y = 0; y < 20; y += CELL) {
        // each cell in it
        for (let x = 0; x < 20; x += CELL) {
          let a = 0;
          FOOTPRINTS.forEach(function (r) {
            a += coverage(x, y, r);
          }); // add up every vehicle in this cell
          if (a > 0) CELLS.push({ x: x, y: y, a: Math.min(a, 1) }); // keep only cells something touches
        }
      }

      let DPR, k, px, left, top, fontPx; //they will be set in resize and then read in draw
      let last = -1;

      function resize() {
        //this is to figure out sizing based on window resizing
        DPR = Math.min(window.devicePixelRatio || 1, 2); //how many real screen pixels make up one css pixel
        const W = window.innerWidth; //screen size in css px
        const H = window.innerHeight;

        cv.width = W * DPR; //how may px the canvas holds
        cv.height = H * DPR;

        //the drawing is here in screen px
        const size = Math.min(W * 0.9, H * 0.68); // how much height od the screen it takes, and margins on the sides
        k = size / VIEW; //px per m
        px = Math.max(1.5, size * WEIGHT); //this is a line weight that changes based on screen size
        left = (W - size) / 2;
        top = H * 0.06;
        fontPx = Math.max(12, size * 0.022); // ~16px on 1080p, ~32px on 4

        draw(Math.max(last, 0)); // redraw at wherever we were, or at the start if never drawn
      }

      function draw(p) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cv.width, cv.height);
        //i want to work in "meters" for ease so:
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0); //this is setting my horizontal & vertical scale
        ctx.translate(left + 3 * k, top + 3 * k); //and moving the origin pt to the top left corner of my swuare
        ctx.scale(k, k);

        ctx.font = fontPx + "px Cabin, sans-serif";
        ctx.fillStyle = "#b8b3a8"; //--bone color from css
        ctx.textAlign = "center";

        //the grid, a line every 2m, and fades in with the scroll cue iin CUES

        ctx.globalAlpha = ramp(p, CUES.grid); //sets opacity for what's coming
        label("2m", 9, 17.7);
        ctx.strokeStyle = GRID;
        ctx.lineWidth = (px * 0.5) / k; //half the weight and converted to m
        ctx.beginPath();
        for (let m = 2; m < 20; m += 2) {
          // m at 2,4,6,8..
          ctx.moveTo(m, 0);
          ctx.lineTo(m, 20); // vertical line "m" meters in

          ctx.moveTo(0, m);
          ctx.lineTo(20, m); //horizontal line "m" meters down
        }
        ctx.stroke();

        //the clip of the land (square)
        ctx.globalAlpha = 1;
        label("20m", 10, -0.8);
        ctx.strokeStyle = INK;
        ctx.lineWidth = px / k; // full weight, converted to metres
        ctx.strokeRect(0, 0, 20, 20); // 20 m × 20 m

        //example px
        ctx.globalAlpha = ramp(p, CUES.pixel);
        ctx.strokeRect(8, 14, 2, 2); //one 2m px

        //dimension line
        ctx.beginPath();
        ctx.moveTo(8, 16.6);
        ctx.lineTo(8, 17); // left tick
        ctx.moveTo(8, 16.8);
        ctx.lineTo(10, 16.8); // the line, 2 m long
        ctx.moveTo(10, 16.6);
        ctx.lineTo(10, 17); // right tick
        ctx.stroke();

        //the satellite cells
        ctx.fillStyle = INK;
        CELLS.forEach(function (c) {
          ctx.globalAlpha = ramp(p, CUES.cells) * c.a;
          ctx.fillRect(c.x, c.y, CELL, CELL);
        });

        //vehicles
        ctx.globalAlpha = ramp(p, CUES.vehicles) * (1 - ramp(p, CUES.cells));
        ctx.strokeStyle = INK;
        ctx.lineWidth = px / k;
        outline(CAR);
        outline(HULL);
        outline(TURRET);
        outline(BARREL);
      }
      resize();
      window.addEventListener("resize", resize);
      document.fonts.ready.then(resize); // redraw once Cabin has loaded incase canvas txt doesnt wait

      //redrawing frame when scrolling away or in
      return {
        update: function (p) {
          if (!s.active) return;
          stackView.style.opacity = 1;
          poseStack(STACK_REST);
          layer.style.setProperty(
            "--pop",
            smooth(clamp01(Math.min(p / IN, (1 - p) / (1 - OUT)))),
          );
          if (p !== last) {
            draw(p); //redraw when one has scrolled
            last = p;
          }
        },
      };
    },
    govmap: function (stage, s) {
      const layer = stackView.querySelector('[data-layer="kyl"]');
      const box = layer.querySelector(".govmap");
      const kylCv = layer.querySelector("canvas.gsd");
      const levels = Array.from(
        box.querySelectorAll("img[data-res]"),
      ).reverse();
      const n = levels.length;

      //timings
      const SHOW = 0.08; // image fades in over the cells, by here
      const CLEAR_FROM = 0.15,
        CLEAR_TO = 0.45; // pixels → full
      const BLUR_FROM = 0.75,
        BLUR_TO = 0.88; // full → 2 m again ("re-blurred")
      const OUT = 0.92; // everything to black, from here to the end

      const CLEAR_STEP = (CLEAR_TO - CLEAR_FROM) / n;
      // const CUES = {show: 0, to1m: 0.25, toFull: 0.45, out: 0.85};

      function clamp01(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
      }
      function ramp(p, at, len) {
        return clamp01((p - at) / len);
      }

      return {
        update: function (p) {
          if (!s.active) return;
          poseStack(STACK_REST);
          layer.style.setProperty("--pop", 1);

          const show = ramp(p, 0, SHOW);
          box.style.opacity = show; //fades in
          kylCv.style.opacity = 1 - show; //fades out

          levels.forEach(function (img, i) {
            const clear = 1 - ramp(p, CLEAR_FROM + i * CLEAR_STEP, CLEAR_STEP);
            const back = i === 0 ? ramp(p, BLUR_FROM, BLUR_TO - BLUR_FROM) : 0;
            img.style.opacity = Math.max(clear, back);
          });

          stackView.style.opacity = 1 - ramp(p, OUT, 1 - OUT);
        },
        exit: function () {
          box.style.opacity = 0;
          kylCv.style.opacity = "";
        },
      };
    },
    tabsoun: function (stage, s) {
      const scene = stage.querySelector("a-scene");
      const cam = stage.querySelector("a-camera");
      const clips = Array.from(stage.querySelectorAll(".hyrax"));
      const vids = clips.map(function (c) {
        return c.querySelector("video");
      });

      const AT = [0.27, 0.48, 0.51, 0.54, 0.57, 0.6]; // when each clip loads, same order as the HTML

      const FADE = 0.04; //how much scroll for a clip to fade itn
      const START = { yaw: 184.1, pitch: -35.8, fov: 30 }; //from test panorma html
      const END = { yaw: 184.1 - 43.2, pitch: 20, fov: 120 }; // = 140.9, a different view
      const ZOOM_FROM = 0.03,
        ZOOM_TO = 0.28;
      const DRIFT = -40; //degrees of turn

      let last = -1;

      function clamp01(x) {
        return x < 0 ? 0 : x > 1 ? 1 : x;
      }
      function ramp(p, at, len) {
        return clamp01((p - at) / len);
      }
      function mix(a, b, t) {
        return a + (b - a) * t;
      } // a at t = 0, b at t = 1, in between otherwise

      function smooth(t) {
        return t * t * (3 - 2 * t);
      }

      function pose(yaw, pitch, fov) {
        cam.setAttribute("rotation", { x: pitch, y: -yaw, z: 0 });
        cam.setAttribute("camera", "fov", fov);
      }

      window.addEventListener("resize", function () {
        last = -1;
      }); // redraw at the new size if needed

      return {
        update: function (p) {
          clips.forEach(function (c, i) {
            const a = clamp01((p - AT[i]) / FADE);
            c.style.opacity = a;
            c.style.visibility = a > 0 ? "visible" : "hidden";

            /* only decode a video while it is on screen */
            const v = vids[i];
            const on = s.active && a > 0; // visible AND you're in the scene
            if (on && v.paused) v.play().catch(function () {});
            if (!on && !v.paused) v.pause();
          });

          /* panorama: only redraw when something's changed */
          if (!scene.renderStarted) return;
          if (p === last) return;
          last = p;

          const t = smooth(clamp01((p - ZOOM_FROM) / (ZOOM_TO - ZOOM_FROM)));
          pose(
            mix(START.yaw, END.yaw, t) + p * DRIFT,
            mix(START.pitch, END.pitch, t),
            mix(START.fov, END.fov, t),
          );
          scene.render();
        },
        exit: function () {
          vids.forEach(function (v) {
            v.pause();
          });
        }, // leaving: stop them all
      };
    },
  };

  /* reading scenes from html */
  const film = document.getElementById("film");
  const stackView = document.getElementById("stack");

  const SCENES = Array.prototype.map.call(
    film.querySelectorAll(".scene"),
    function (el) {
      let stage = el.querySelector(".stage");
      if (!stage) {
        /* tolerate a scene without one */
        stage = document.createElement("div");
        stage.className = "stage";
        el.appendChild(stage);
      }

      // come back to these if podcast quote needed in the layer that zooms back
      // const subs  = Array.prototype.slice.call(stage.querySelectorAll('.sub'));
      // const timed = subs.some(function(el){ return el.hasAttribute('data-t'); });
      // if (timed) subs.sort(function(a, b){ return parseFloat(a.dataset.t) - parseFloat(b.dataset.t); });

      return {
        el: el,
        stage: stage,
        vo: stage.querySelector("audio.vo"),
        subs: Array.prototype.slice.call(stage.querySelectorAll(".sub")),
        timed: !!stage.querySelector(".sub[data-t]"),
        gain: 0 /* where the voice is in its ramp */,
        rewind: false /* was the top the way out? */,
        shown: null,
        id: el.dataset.scene || "",
        register: el.dataset.register || "",
        screens: parseFloat(el.dataset.screens) || 3,
        behaviour: BEHAVIOURS[el.dataset.scene] || null,
        api: null,
        mounted: false,
        active: null /* null so the first render always writes */,
      };
    },
  );

  function mount(s) {
    if (s.mounted) return;
    s.mounted = true;
    if (!s.behaviour) {
      s.api = {};
      return;
    }
    let api = s.behaviour(s.stage, s);
    if (typeof api === "function") api = { update: api };
    s.api = api || {};
  }

  let filmLen = 0;
  let VH = window.innerHeight;

  /* data-screens is in window-heights, converted to pixels here and
   redone on resize, so the pacing means the same thing on 
   laptop and on a kiosk screen. */
  function buildTimeline() {
    VH = window.innerHeight;
    let acc = 0;
    SCENES.forEach(function (s) {
      s.len = Math.max(1, Math.round(s.screens * VH));
      s.start = acc;
      acc += s.len;
      s.el.style.height = s.len + "px";
    });
    filmLen = acc;
  }

  /* Measured from #film's own top rather than window.scrollY */
  let raw = 0;
  function readScroll() {
    raw = Math.max(0, Math.min(filmLen, -film.getBoundingClientRect().top));
  }

  const MOUNT_MARGIN = 1.5; /* window-heights either side */
  const EDGE = 0.15; /* fraction of a scene spent fading in / out */
  const VOICE_FADE = 0.6; /* seconds a voice takes to ramp out */

  let currentScene = null;

  function show(s, el) {
    if (el === s.shown) return;
    if (s.shown) s.shown.removeAttribute("data-on");
    if (el) el.setAttribute("data-on", "");
    s.shown = el;
  }

  /* the mix drives the subtitles: last sentence whose data-t has passed */
  function caption(s, t) {
    let now = null;
    for (let i = 0; i < s.subs.length; i++) {
      if (t >= parseFloat(s.subs[i].dataset.t)) now = s.subs[i];
    }
    show(s, now);
  }

  /* until a scene is timed, scroll drives them instead:
   sentence i holds from p = i/n to p = (i+1)/n */
  function captionByScroll(s, p) {
    const n = s.subs.length;
    if (!n) return;
    let i = Math.floor(p * n);
    if (i < 0) i = 0;
    if (i > n - 1) i = n - 1;
    show(s, s.subs[i]);
  }

  /* to run vids based on sub cue*/

  function cue(s) {
    const now = s.subs.indexOf(s.shown);
    s.subs.forEach(function (sub, i) {
      if (!sub.dataset.cue) return;
      const v = document.getElementById(sub.dataset.cue);
      const on = now >= i;
      if (on === v.hasAttribute("data-on")) return;
      if (on) {
        v.setAttribute("data-on", "");
        v.currentTime = 0;
        v.play().catch(function () {});
      } else {
        v.removeAttribute("data-on");
        v.pause();
      }
    });
  }

  let last = 0;
  function render(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;

    SCENES.forEach(function (s) {
      const p = (raw - s.start) / s.len;
      const local = p < 0 ? 0 : p > 1 ? 1 : p;

      const near =
        raw > s.start - MOUNT_MARGIN * VH &&
        raw < s.start + s.len + MOUNT_MARGIN * VH;
      if (near) mount(s);

      /* a trapezoid: up over the first 15%, hold, down over the last 15% */
      let fade = Math.min(local / EDGE, (1 - local) / EDGE);
      fade = fade < 0 ? 0 : fade > 1 ? 1 : fade;

      s.el.style.setProperty("--p", local.toFixed(4));
      s.el.style.setProperty("--fade", fade.toFixed(4));

      const active = p >= 0 && p < 1;
      if (active !== s.active) {
        const first = s.active === null;
        s.active = active;
        s.el.dataset.active = active ? "true" : "false";

        if (s.vo) {
          if (active) {
            s.gain = 1; /* coming back cancels a ramp in progress */
            s.rewind = false;
            s.vo.volume = 1;
            s.vo.play().catch(function () {});
          } else if (!first) {
            /* out the top means you went back to the beginning, so the voice
             starts over next time; out the bottom just parks it where it was */
            s.rewind = p < 0;
          }
        }
        if (s.api) {
          if (active && s.api.enter) s.api.enter();
          else if (!active && !first && s.api.exit) s.api.exit();
        }
        if (active) currentScene = s;
      }

      if (near) {
        if (s.timed) {
          if (s.vo && !s.vo.paused) caption(s, s.vo.currentTime);
        } else captionByScroll(s, local);
        cue(s);
      }

      /* ramp a departing voice down over VOICE_FADE, then park it */
      if (s.vo && !s.active && s.gain > 0) {
        s.gain = Math.max(0, s.gain - dt / VOICE_FADE);
        s.vo.volume = s.gain;
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

      if (near && s.api && s.api.update) s.api.update(local, fade);
    });

    updateHud();
    stackView.hidden = !(
      currentScene && currentScene.el.hasAttribute("data-stack")
    ); //is there a stack at all?
    requestAnimationFrame(render);
  }

  /*temp*/
  const hud = document.createElement("div");
  hud.id = "hud";
  hud.innerHTML =
    '<span class="n"></span><span class="reg"></span>' +
    '<span class="id"></span><div class="bar"><i></i></div>' +
    '<div class="bar vo"><i></i></div>';
  document.body.appendChild(hud);
  const hudN = hud.querySelector(".n"),
    hudReg = hud.querySelector(".reg"),
    hudId = hud.querySelector(".id"),
    hudBar = hud.querySelector(".bar i"),
    voBar = hud.querySelector(".bar.vo i");

  function updateHud() {
    const s = currentScene;
    if (!s) return;
    hudN.textContent = SCENES.indexOf(s) + 1 + " / " + SCENES.length;
    hudReg.textContent = s.register;
    hudId.textContent = s.id;
    hudBar.style.transform =
      "scaleX(" +
      Math.max(0, Math.min(1, (raw - s.start) / s.len)).toFixed(4) +
      ")";

    let v = 0;
    if (s.vo && isFinite(s.vo.duration)) {
      v = s.vo.currentTime / s.vo.duration;
    }
    voBar.style.transform = "scaleX(" + v.toFixed(4) + ")";
  }

  window.addEventListener("scroll", readScroll, { passive: true });

  let resizeTimer = 0;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      buildTimeline();
      readScroll();
    }, 120);
  });

  buildTimeline();
  readScroll();

  film.SCENES = SCENES; /* console: film.SCENES shows the measured timeline */
})();
