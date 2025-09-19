document.addEventListener('DOMContentLoaded', function(){

  // ---------------- Smooth scroll for in-page anchors ----------------
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id=a.getAttribute('href').slice(1);
      const el=document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}) }
    });
  });

  const THEME_KEY = 'theme';
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  // ---------------- Pill Hint (create BEFORE theme init uses it) ----------------
  let pill = document.createElement('div');
  pill.className = 'pill-hint';
  pill.setAttribute('aria-hidden', 'true');
  pill.innerHTML = `
    <svg class="pill-icon" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="capsule">
          <rect x="0" y="0" width="100" height="50" rx="25" ry="25"></rect>
        </clipPath>
      </defs>
      <g clip-path="url(#capsule)">
        <rect class="pill-body" x="0" y="0" width="100" height="50" rx="25" ry="25"></rect>
        <ellipse class="pill-shine" cx="30" cy="16" rx="16" ry="8"></ellipse>
      </g>
    </svg>
    <span class="pill-text"></span>
  `;
  document.body.appendChild(pill);

  function updatePill(){
    const current = root.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    const isNextDark = next === 'dark';
    pill.classList.toggle('pill--red', isNextDark);
    pill.classList.toggle('pill--blue', !isNextDark);
    pill.querySelector('.pill-text').textContent = isNextDark ? 'wonderland' : 'blissfull ignorance';
  }

  function setTheme(next){
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if(btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
    updatePill();
  }

  // Init theme + pill
  const stored = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(stored);

  if(!btn) return;

  function placePillNearButton(){
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width/2;
    const y = r.bottom;
    pill.style.left = Math.round(x - pill.offsetWidth/2) + 'px';
    pill.style.top  = Math.round(y - 10 - pill.offsetHeight) + 'px';
  }

  btn.addEventListener('mouseenter', ()=>{
    updatePill();
    placePillNearButton();
    pill.classList.add('show');
  });
  btn.addEventListener('mouseleave', ()=> pill.classList.remove('show'));
  window.addEventListener('scroll', ()=>{ if(pill.classList.contains('show')) placePillNearButton(); });
  window.addEventListener('resize', ()=>{ if(pill.classList.contains('show')) placePillNearButton(); });

  // ---------------- Page check (About vs others) ----------------
  const path = window.location.pathname;
  const isAbout = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('about.html') || path === '';

  if(!isAbout){
    // Non-index pages: plain toggle only
    btn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      setTheme(next);
    });
    return;
  }

  // ---------------- About page: TEXT-AWARE MATRIX EFFECT ----------------
  const MATRIX_CHARS = 'アァカサタナハマヤャラワガザダバパ...0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function isVisibleElement(node){
    if(!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    if(style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  let wrappedOnce = false;

  function prepareTextTargets(rootEl){
    const stopTags = new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','CANVAS','SVG','IMG','BUTTON','INPUT','TEXTAREA','SELECT']);
    const allSpans = [];

    if(!wrappedOnce){
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          const parent = node.parentElement;
          if(!parent || stopTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          const text = node.nodeValue;
          if(!text || !text.replace(/\s+/g,'').length) return NodeFilter.FILTER_REJECT;
          if(!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const replaceNodes = [];
      while(walker.nextNode()){
        replaceNodes.push(walker.currentNode);
      }

      replaceNodes.forEach(node => {
        const frag = document.createDocumentFragment();
        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline';
        const txt = node.nodeValue;
        for(let i=0;i<txt.length;i++){
          const ch = txt[i];
          const span = document.createElement('span');
          span.className = 'mx-char';
          span.dataset.orig = ch;
          if(ch === ' '){
            span.textContent = '\u00A0';
            span.dataset.space = '1';
          } else {
            span.textContent = ch;
          }
          wrapper.appendChild(span);
        }
        frag.appendChild(wrapper);
        node.parentNode.replaceChild(frag, node);
      });

      wrappedOnce = true;
    }

    const columns = new Map();
    document.querySelectorAll('.mx-char').forEach(el => {
      const rect = el.getBoundingClientRect();
      if(rect.width === 0 && (el.dataset.orig || '').trim() === '') return;
      const key = Math.round(rect.left);
      const cy = Math.round(rect.top);
      if(!columns.has(key)) columns.set(key, { x:key, items:[] });
      columns.get(key).items.push({ el, y: cy });
      allSpans.push(el);
    });
    columns.forEach(col => col.items.sort((a,b)=>a.y - b.y));
    return { columns, allSpans };
  }

  let running = false;

  function matrixTextTransition({ duration=1100 } = {}){
    if(running) return;
    running = true;

    const start = performance.now();
    const { columns, allSpans } = prepareTextTargets(document.body);

    const starts = new Map();
    const speeds = new Map();
    columns.forEach((col, key) => {
      starts.set(key, -Math.floor(Math.random()*8) - 3);
      speeds.set(key, 18 + Math.random()*24);
    });

    let themeFlipped = false;

    function tick(now){
      const elapsedMs = now - start;
      const elapsedSec = elapsedMs / 1000;
      const done = elapsedMs >= duration;

      columns.forEach((col, key) => {
        const items = col.items;
        if(items.length === 0) return;
        const head = Math.floor(starts.get(key) + elapsedSec * speeds.get(key));
        for(let i=0;i<items.length;i++){
          const el = items[i].el;
          if(el.dataset.space === '1') continue;

          if(i <= head){
            if(!el.classList.contains('mx-on')){
              el.textContent = MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
              el.classList.add('mx-on');
              if(Math.random() < 0.6) el.classList.add('mx-fade'); else el.classList.remove('mx-fade');
            }else if(Math.random() < 0.18){
              el.textContent = MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
            }
          }
        }
      });

      if(!themeFlipped && elapsedMs >= duration/2){
        themeFlipped = true;
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        setTheme(next);
      }

      if(!done){
        requestAnimationFrame(tick);
      }else{
        setTimeout(()=>{
          allSpans.forEach(el => {
            if(el.dataset.space === '1'){
              el.textContent = '\u00A0';
            }else{
              el.textContent = el.dataset.orig || el.textContent;
            }
            el.classList.remove('mx-on','mx-fade');
          });
          running = false;
        }, 120);
      }
    }

    requestAnimationFrame(tick);
  }

  btn.addEventListener('click', ()=>{
    matrixTextTransition({ duration: 1100 });
  });

});
