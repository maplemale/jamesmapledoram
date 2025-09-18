document.addEventListener('DOMContentLoaded', function(){

  // ---------------- Smooth scroll for in-page anchors ----------------
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id=a.getAttribute('href').slice(1);
      const el=document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}) }
    });
  });

  // ---------------- Theme init ----------------
  const THEME_KEY = 'theme';
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  function setTheme(next){
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if(btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  const stored = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(stored);

  if(!btn) return;

  // Determine if we are on the About (index) page (GitHub Pages friendly)
  const path = window.location.pathname;
  const isAbout = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('about.html') || path === '';

  // ---------------- Non-index pages: plain, instant toggle ----------------
  if(!isAbout){
    btn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      setTheme(next);
    });
    return;
  }

  // ---------------- About page: TEXT-AWARE MATRIX EFFECT ----------------
  // Whitespace-safe, column-grouped, with mid-animation theme flip
  const MATRIX_CHARS = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function isVisibleElement(node){
    if(!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    if(style.visibility === 'hidden' || style.display === 'none') return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // One-time wrapper guard so we don't rewrap on every toggle
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
          // Allow strings that contain whitespace, but require at least one visible char
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
        wrapper.style.display = 'inline'; // preserve natural flow
        const txt = node.nodeValue;
        for(let i=0;i<txt.length;i++){
          const ch = txt[i];
          const span = document.createElement('span');
          span.className = 'mx-char';
          span.dataset.orig = ch;
          if(ch === ' '){
            // Render spaces as NBSP to preserve layout width visually
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

    // Group characters by their X position (pixel column)
    const columns = new Map();
    document.querySelectorAll('.mx-char').forEach(el => {
      const rect = el.getBoundingClientRect();
      // Skip fully collapsed spans that carry only whitespace
      if(rect.width === 0 && (el.dataset.orig || '').trim() === '') return;
      const key = Math.round(rect.left);
      const cy = Math.round(rect.top);
      if(!columns.has(key)) columns.set(key, { x:key, items:[] });
      columns.get(key).items.push({ el, y: cy });
      allSpans.push(el);
    });
    // Sort each column by vertical position
    columns.forEach(col => col.items.sort((a,b)=>a.y - b.y));
    return { columns, allSpans };
  }

  let running = false;

  function matrixTextTransition({ duration=1100 } = {}){
    if(running) return;
    running = true;

    const start = performance.now();
    const { columns, allSpans } = prepareTextTargets(document.body);

    // Per-column speeds and staggered starts
    const starts = new Map(); // starting index offset (negative)
    const speeds = new Map(); // items per second
    columns.forEach((col, key) => {
      starts.set(key, -Math.floor(Math.random()*8) - 3); // -3..-10
      speeds.set(key, 18 + Math.random()*24);            // 18..42 items/sec
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
          // Don't animate spaces to preserve exact layout
          if(el.dataset.space === '1') continue;

          if(i <= head){
            if(!el.classList.contains('mx-on')){
              el.textContent = MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
              el.classList.add('mx-on');
              if(Math.random() < 0.6) el.classList.add('mx-fade'); else el.classList.remove('mx-fade');
            }else if(Math.random() < 0.18){
              // occasional shimmer
              el.textContent = MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
            }
          }
        }
      });

      // Flip theme mid-way
      if(!themeFlipped && elapsedMs >= duration/2){
        themeFlipped = true;
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        setTheme(next);
      }

      if(!done){
        requestAnimationFrame(tick);
      }else{
        // Revert characters to originals, including spaces (render as NBSP)
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

  // Hook up the button on About only
  btn.addEventListener('click', ()=>{
    matrixTextTransition({ duration: 1100 });
  });

});
