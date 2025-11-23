document.addEventListener('DOMContentLoaded', function(){

  // Smooth scroll for hash links
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

  // --- Persona + title + inline persona link active state
  function updateContentMode(theme){
    const productSection = document.querySelector('.content-mode--product');
    const engineeringSection = document.querySelector('.content-mode--engineering');
    const isDark = theme === 'dark';

    if (productSection && engineeringSection){
      productSection.setAttribute('aria-hidden', isDark ? 'true' : 'false');
      engineeringSection.setAttribute('aria-hidden', isDark ? 'false' : 'true');
    }

    // Update document title
    if (isDark){
      document.title = 'James R. Mapledoram — Engineering Leadership';
    } else {
      document.title = 'James R. Mapledoram — Product Leadership';
    }

    // Update inline persona link active state
    document.querySelectorAll('.persona-inline').forEach(link => {
      const view = link.dataset.view;
      const shouldBeActive =
        (!isDark && view === 'product') ||
        ( isDark && view === 'engineering');
      link.classList.toggle('active', shouldBeActive);
    });
  }

  function setTheme(next){
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);

    // Button label describes the *other* portfolio
    if(btn){
      btn.textContent = next === 'dark'
        ? '🎯 Product Portfolio'
        : '🛠 Engineering Portfolio';
    }

    updateContentMode(next);
  }

  function getInitialTheme(){
    const params = new URLSearchParams(window.location.search);

    // High-level "view" param: ?view=engineering or ?view=product
    const view = (params.get('view') || '').toLowerCase();
    if (view) {
      if (['engineering', 'eng', 'dev'].includes(view)) {
        return 'dark';   // engineering persona
      }
      if (['product', 'pm'].includes(view)) {
        return 'light';  // product persona
      }
    }

    // Optional explicit theme override: ?theme=dark or ?theme=light
    const themeParam = (params.get('theme') || '').toLowerCase();
    if (themeParam === 'dark' || themeParam === 'light') {
      return themeParam;
    }

    // Otherwise fall back to saved theme or default light
    return localStorage.getItem(THEME_KEY) || 'light';
  }

  // Init theme + persona (URL param overrides localStorage)
  const initialTheme = getInitialTheme();
  setTheme(initialTheme);
  if(!btn) return;

  // ---- Matrix text setup
  const MATRIX_CHARS='アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function isVisibleElement(node){
    if(!(node instanceof Element)) return false;
    const s=getComputedStyle(node);
    if(s.visibility==='hidden'||s.display==='none') return false;
    const r=node.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }

  // Unwrap any previous matrix spans so we can re-wrap fresh each time
  function resetWrappedText(){
    const spans = Array.from(document.querySelectorAll('.mx-char'));
    spans.forEach(span=>{
      const parent = span.parentNode;
      if(!parent) return;
      const text = span.dataset.space === '1'
        ? ' '
        : (span.dataset.orig || span.textContent);
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, span);
      parent.normalize();
    });
  }

  function prepareTextTargets(rootEl){
    const stop=new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','CANVAS','SVG','IMG','BUTTON','INPUT','TEXTAREA','SELECT']);
    const allSpans=[];

    // Always reset previous wrapping so we only animate current visible content
    resetWrappedText();

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
        if(/\s/.test(ch)){
          span.textContent=' ';
          span.dataset.space='1';
        } else {
          span.textContent=ch;
        }
        wrap.appendChild(span);
      }
      frag.appendChild(wrap);
      node.parentNode.replaceChild(frag,node);
    });

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
  function matrixTextTransition({duration=2000, targetTheme=null}={}){
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
              el.classList.add('mx-on');
              (Math.random()<0.6)?el.classList.add('mx-fade'):el.classList.remove('mx-fade');
            } else if(Math.random()<0.18){
              el.textContent=MATRIX_CHARS.charAt((Math.random()*MATRIX_CHARS.length)|0);
            }
          }
        }
      });

      // Flip theme midway through
      if(!flipped && ms>=duration/2){
        flipped=true;
        const curTheme=root.getAttribute('data-theme')||'light';
        let next = targetTheme;
        if (!next){
          next = curTheme==='light' ? 'dark' : 'light';
        }
        if (next !== curTheme){
          setTheme(next);
        }
      }

      if(!done){
        requestAnimationFrame(tick);
      } else {
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

  // Button click: toggle between personas with matrix effect
  btn.addEventListener('click', ()=>{
    const cur = root.getAttribute('data-theme') || 'light';
    const target = (cur === 'light') ? 'dark' : 'light';
    matrixTextTransition({duration:2000, targetTheme:target});
  });

  // Inline persona links (product / engineering) inside hero
  document.querySelectorAll('.persona-inline').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      const targetTheme = (view === 'engineering') ? 'dark' : 'light';
      matrixTextTransition({duration:2000, targetTheme});
    });
  });

  // Make sure active states are correct on load
  updateContentMode(initialTheme);
});
