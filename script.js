document.addEventListener('DOMContentLoaded', function(){

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id=a.getAttribute('href').slice(1);
      const el=document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}) }
    });
  });

  const THEME_KEY='theme';
  const root=document.documentElement;
  const btn=document.getElementById('themeToggle');

  // ---- Pill tooltip (created before theme init)
  const pill=document.createElement('div');
  pill.className='pill-hint'; pill.setAttribute('aria-hidden','true');
  pill.innerHTML = `
    <svg class="pill-icon" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="capsule"><rect x="0" y="0" width="100" height="50" rx="25" ry="25"></rect></clipPath></defs>
      <g clip-path="url(#capsule)"><rect class="pill-body" x="0" y="0" width="100" height="50" rx="25" ry="25"></rect>
        <ellipse class="pill-shine" cx="30" cy="16" rx="16" ry="8"></ellipse></g>
    </svg>
    <span class="pill-text"></span>`;
  document.body.appendChild(pill);

  function updatePill(){
    const current=root.getAttribute('data-theme')||'light';
    const next=current==='light'?'dark':'light';
    const isNextDark=next==='dark';
    pill.classList.toggle('pill--red', isNextDark);
    pill.classList.toggle('pill--blue', !isNextDark);
    pill.querySelector('.pill-text').textContent = isNextDark ? 'Take the red pill' : 'Take the blue pill';
  }
  function setTheme(next){
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    if(btn) btn.textContent = next==='dark'?'☀️ Light':'🌙 Dark';
    updatePill();
  }

  // Init theme
  setTheme(localStorage.getItem(THEME_KEY)||'light');
  if(!btn) return;

  // Tooltip placement (BELOW the button)
  function placePillNearButton(){
    const r=btn.getBoundingClientRect();
    const x=r.left + r.width/2;
    const y=r.bottom; // below
    pill.style.left=Math.round(x - pill.offsetWidth/2)+'px';
    pill.style.top =Math.round(y + 8)+'px'; // 8px gap
  }
  btn.addEventListener('mouseenter', ()=>{ updatePill(); placePillNearButton(); pill.classList.add('show'); });
  btn.addEventListener('mouseleave', ()=> pill.classList.remove('show'));
  window.addEventListener('scroll', ()=>{ if(pill.classList.contains('show')) placePillNearButton(); });
  window.addEventListener('resize', ()=>{ if(pill.classList.contains('show')) placePillNearButton(); });

  // Page check (About vs others)
  // const path=window.location.pathname;
  // const isAbout = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('about.html') || path==='';

  //if(!isAbout){
    // Non-index pages: instant toggle
    //btn.addEventListener('click', ()=>{
      //const cur=root.getAttribute('data-theme')||'light';
      //setTheme(cur==='light'?'dark':'light');
    //});
    //return;
  //}

  // ---- About page: text-aware Matrix morph (whitespace-safe)
  const MATRIX_CHARS='アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function isVisibleElement(node){
    if(!(node instanceof Element)) return false;
    const s=getComputedStyle(node);
    if(s.visibility==='hidden'||s.display==='none') return false;
    const r=node.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }

  let wrappedOnce=false;
  function prepareTextTargets(rootEl){
    const stop=new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','CANVAS','SVG','IMG','BUTTON','INPUT','TEXTAREA','SELECT']);
    const allSpans=[];
    if(!wrappedOnce){
      const walker=document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node){
          const parent=node.parentElement;
          if(!parent||stop.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          const t=node.nodeValue;
          if(!t || !t.replace(/\s+/g,'').length) return NodeFilter.FILTER_REJECT;
          if(!isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes=[];
      while(walker.nextNode()) nodes.push(walker.currentNode);

      nodes.forEach(node=>{
        const frag=document.createDocumentFragment();
        const wrap=document.createElement('span');
        wrap.style.display='inline';
        const txt=node.nodeValue;
        for(let i=0;i<txt.length;i++){
          const ch=txt[i];
          const span=document.createElement('span');
          span.className='mx-char';
          span.dataset.orig = ch;
          // Normalize whitespace/newlines/tabs to a regular space
          if(/\s/.test(ch)){ span.textContent=' '; span.dataset.space='1'; }
          else { span.textContent=ch; }
          wrap.appendChild(span);
        }
        frag.appendChild(wrap);
        node.parentNode.replaceChild(frag,node);
      });
      wrappedOnce=true;
    }

    const columns=new Map();
    document.querySelectorAll('.mx-char').forEach(el=>{
      const rect=el.getBoundingClientRect();
      // Skip empty-width whitespace spans for column grouping
      if(rect.width===0 && (el.dataset.space==='1')) return;
      const key=Math.round(rect.left);
      const cy=Math.round(rect.top);
      if(!columns.has(key)) columns.set(key,{x:key,items:[]});
      columns.get(key).items.push({el,y:cy});
      allSpans.push(el);
    });
    columns.forEach(col=>col.items.sort((a,b)=>a.y-b.y));
    return {columns, allSpans};
  }

  let running=false;
  function matrixTextTransition({duration=1100}={}){
    if(running) return; running=true;
    const start=performance.now();
    const {columns,allSpans}=prepareTextTargets(document.body);
    const starts=new Map(), speeds=new Map();
    columns.forEach((col,key)=>{ starts.set(key, -Math.floor(Math.random()*8)-3); speeds.set(key, 18+Math.random()*24); });
    let flipped=false;

    function tick(now){
      const ms=now-start, sec=ms/1000, done=ms>=duration;
      columns.forEach((col,key)=>{
        const items=col.items; if(!items.length) return;
        const head=Math.floor(starts.get(key) + sec*speeds.get(key));
        for(let i=0;i<items.length;i++){
          const el=items[i].el;
          if(el.dataset.space==='1') continue; // never animate whitespace
          if(i<=head){
            if(!el.classList.contains('mx-on')){
              el.textContent=MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
              el.classList.add('mx-on'); (Math.random()<0.6)?el.classList.add('mx-fade'):el.classList.remove('mx-fade');
            } else if(Math.random()<0.18){
              el.textContent=MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
            }
          }
        }
      });

      if(!flipped && ms>=duration/2){
        flipped=true;
        const cur=root.getAttribute('data-theme')||'light';
        setTheme(cur==='light'?'dark':'light');
      }

      if(!done){ requestAnimationFrame(tick); }
      else {
        setTimeout(()=>{
          allSpans.forEach(el=>{
            el.textContent = (el.dataset.space==='1') ? ' ' : (el.dataset.orig || el.textContent);
            el.classList.remove('mx-on','mx-fade');
          });
          running=false;
        },120);
      }
    }
    requestAnimationFrame(tick);
  }

  btn.addEventListener('click', ()=> matrixTextTransition({duration:1100}) );
});
