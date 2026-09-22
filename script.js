
(function(){
'use strict';

document.documentElement.classList.remove('no-js');



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

};


/* reading scenes from html */
const film = document.getElementById('film');

const SCENES = Array.prototype.map.call(
  film.querySelectorAll('.scene'),
  function(el){
    let stage = el.querySelector('.stage');
    if (!stage){                       /* tolerate a scene without one */
      stage = document.createElement('div');
      stage.className = 'stage';
      el.appendChild(stage);
    }
    return {
      el: el,
      stage: stage,
      id: el.dataset.scene || '',
      register: el.dataset.register || '',
      screens: parseFloat(el.dataset.screens) || 3,
      behaviour: BEHAVIOURS[el.dataset.scene] || null,
      api: null,
      mounted: false,
      active: null                     /* null so the first render always writes */
    };
  }
);

/* Behaviours run lazily, when the visitor is near. Nothing heavy is
   built at load. Scenes are never torn down once mounted — exit() is
   enough to stop what's expensive, and tearing down would throw away
   whatever state the scene had. */
function mount(s){
  if (s.mounted) return;
  s.mounted = true;
  if (!s.behaviour){ s.api = {}; return; }
  let api = s.behaviour(s.stage, s);
  if (typeof api === 'function') api = { update: api };
  s.api = api || {};
}


/* ============================================================
   THE CLOCK
   ------------------------------------------------------------
   One place owns scroll position. Nothing else may read
   window.scrollY — everything asks the clock. That rule is what
   lets you reorder scenes in the HTML without touching any of them.
   ============================================================ */
let filmLen = 0;
let VH = window.innerHeight;

/* data-screens is in window-heights, converted to pixels here and
   redone on resize, so the pacing means the same thing on your
   laptop and on a kiosk screen. */
function buildTimeline(){
  VH = window.innerHeight;
  let acc = 0;
  SCENES.forEach(function(s){
    s.len   = Math.max(1, Math.round(s.screens * VH));
    s.start = acc;
    acc += s.len;
    s.el.style.height = s.len + 'px';
  });
  filmLen = acc;
}

/* Measured from #film's own top rather than window.scrollY */
let raw = 0;
function readScroll(){
  raw = Math.max(0, Math.min(filmLen, -film.getBoundingClientRect().top));
}



const MOUNT_MARGIN = 1.5;   /* window-heights either side */
const EDGE = 0.15;          /* fraction of a scene spent fading in / out */

let currentScene = null;

function render(){
  SCENES.forEach(function(s){
    const p = (raw - s.start) / s.len;
    const local = p < 0 ? 0 : p > 1 ? 1 : p;

    const near = (raw > s.start - MOUNT_MARGIN*VH) &&
                 (raw < s.start + s.len + MOUNT_MARGIN*VH);
    if (near) mount(s);

    /* a trapezoid: up over the first 15%, hold, down over the last 15% */
    let fade = Math.min(local / EDGE, (1 - local) / EDGE);
    fade = fade < 0 ? 0 : fade > 1 ? 1 : fade;

    s.el.style.setProperty('--p', local.toFixed(4));
    s.el.style.setProperty('--fade', fade.toFixed(4));

    const active = (p >= 0 && p < 1);
    if (active !== s.active){
      const first = (s.active === null);
      s.active = active;
      s.el.dataset.active = active ? 'true' : 'false';
      if (s.api){
        if (active && s.api.enter) s.api.enter();
        else if (!active && !first && s.api.exit) s.api.exit();
      }
      if (active) currentScene = s;
    }

    if (near && s.api && s.api.update) s.api.update(local, fade);
  });

  updateHud();
  requestAnimationFrame(render);
}


/*temp*/
const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = '<span class="n"></span><span class="reg"></span>' +
                '<span class="id"></span><div class="bar"><i></i></div>';
document.body.appendChild(hud);
const hudN   = hud.querySelector('.n'),
      hudReg = hud.querySelector('.reg'),
      hudId  = hud.querySelector('.id'),
      hudBar = hud.querySelector('.bar i');

function updateHud(){
  const s = currentScene;
  if (!s) return;
  hudN.textContent   = (SCENES.indexOf(s) + 1) + ' / ' + SCENES.length;
  hudReg.textContent = s.register;
  hudId.textContent  = s.id;
  hudBar.style.transform =
    'scaleX(' + Math.max(0, Math.min(1, (raw - s.start) / s.len)).toFixed(4) + ')';
}



window.addEventListener('scroll', readScroll, { passive:true });

let resizeTimer = 0;
window.addEventListener('resize', function(){
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){ buildTimeline(); readScroll(); }, 120);
});

buildTimeline();
readScroll();
requestAnimationFrame(render);

film.SCENES = SCENES;   /* console: film.SCENES shows the measured timeline */

})();
