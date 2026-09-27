
(function(){
'use strict';

document.documentElement.classList.remove('no-js');

const gate = document.getElementById('gate');
document.getElementById('launch').addEventListener('click', function(){
  gate.hidden = true;

  
  window.scrollTo({ top: 0, behavior: 'instant' });

 
  buildTimeline();
  readScroll();
  requestAnimationFrame(render);
});


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

  

  castle: function(stage){
    const mv = stage.querySelector('model-viewer');
    return{
        update: function(p){
            // mv.cameraOrbit = (p*90) + 'deg 75deg 55%'
            mv.cameraOrbit = (100 + p * 360) + 'deg 78deg 55%';

        }
    }
  }

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
      vo:    stage.querySelector('audio.vo'),
      subs:  Array.prototype.slice.call(stage.querySelectorAll('.sub')),
      timed: !!stage.querySelector('.sub[data-t]'),
      gain:  0,                        /* where the voice is in its ramp */
      rewind: false,                   /* was the top the way out? */
      shown: null,
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


function mount(s){
  if (s.mounted) return;
  s.mounted = true;
  if (!s.behaviour){ s.api = {}; return; }
  let api = s.behaviour(s.stage, s);
  if (typeof api === 'function') api = { update: api };
  s.api = api || {};
}



let filmLen = 0;
let VH = window.innerHeight;

/* data-screens is in window-heights, converted to pixels here and
   redone on resize, so the pacing means the same thing on 
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
const VOICE_FADE = 0.6;     /* seconds a voice takes to ramp out */

let currentScene = null;


function show(s, el){
  if (el === s.shown) return;
  if (s.shown) s.shown.removeAttribute('data-on');
  if (el)      el.setAttribute('data-on', '');
  s.shown = el;
}

/* the mix drives the subtitles: last sentence whose data-t has passed */
function caption(s, t){
  let now = null;
  for (let i = 0; i < s.subs.length; i++){
    if (t >= parseFloat(s.subs[i].dataset.t)) now = s.subs[i];
  }
  show(s, now);
}

/* until a scene is timed, scroll drives them instead:
   sentence i holds from p = i/n to p = (i+1)/n */
function captionByScroll(s, p){
  const n = s.subs.length;
  if (!n) return;
  let i = Math.floor(p * n);
  if (i < 0) i = 0;
  if (i > n - 1) i = n - 1;
  show(s, s.subs[i]);
}


let last = 0;
function render(now){
  const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
  last = now;

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

      if (s.vo){
        if (active){
          s.gain = 1;                  /* coming back cancels a ramp in progress */
          s.rewind = false;
          s.vo.volume = 1;
          s.vo.play().catch(function(){});
        } else if (!first){
          /* out the top means you went back to the beginning, so the voice
             starts over next time; out the bottom just parks it where it was */
          s.rewind = (p < 0);
        }
      }
      if (s.api){
        if (active && s.api.enter) s.api.enter();
        else if (!active && !first && s.api.exit) s.api.exit();
      }
      if (active) currentScene = s;
    }

   
    if (near){
      if (s.timed){ if (s.vo && !s.vo.paused) caption(s, s.vo.currentTime); }
      else        captionByScroll(s, local);
    }

    /* ramp a departing voice down over VOICE_FADE, then park it */
    if (s.vo && !s.active && s.gain > 0){
      s.gain = Math.max(0, s.gain - dt / VOICE_FADE);
      s.vo.volume = s.gain;
      if (s.gain === 0){
        s.vo.pause();
        if (s.rewind){ s.vo.currentTime = 0; caption(s, -1); s.rewind = false; }
      }
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


film.SCENES = SCENES;   /* console: film.SCENES shows the measured timeline */

})();
