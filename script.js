
// --- Smooth scroll for in-page anchors ---
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id=a.getAttribute('href').slice(1);
    const el=document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}) }
  });
});

// --- Theme with Matrix transition overlay ---
(function(){
  const THEME_KEY = 'theme';
  const btn = document.getElementById('themeToggle');
  const root = document.documentElement;

  // Ensure initial theme
  const stored = localStorage.getItem(THEME_KEY) || 'light';
  root.setAttribute('data-theme', stored);
  if(btn) btn.textContent = stored === 'dark' ? '☀️ Light' : '🌙 Dark';

  // Create overlay + canvas once
  let overlay = document.querySelector('.matrix-overlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.className = 'matrix-overlay';
    overlay.innerHTML = '<canvas id="matrixCanvas"></canvas>';
    document.body.appendChild(overlay);
  }
  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Resize canvas to viewport
  function fitCanvas(){
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', fitCanvas);
  fitCanvas();

  let rafId = null;
  let running = false;

  function startMatrix({ mode='to-dark' } = {}){
    if(running) return;
    running = true;
    overlay.classList.add('active');

    // Setup columns and drops
    const fontSize = 16;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops = new Array(columns).fill(1);

    // Choose colors based on mode
    // to-dark: black & green on light background, then dark theme applies
    // to-light: white/green on dark background, then light theme applies
    const bgLight = '#ffffff';
    const bgDark = '#0b0e14'; // matches site dark bg
    const codeGreen = '#22c55e'; // accent green
    const textBright = mode === 'to-dark' ? '#111827' : '#e5e7eb';
    const bg = mode === 'to-dark' ? bgLight : bgDark;

    // Prepare background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Matrix characters
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズヅブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let frames = 0;
    const maxFrames = 42; // ~700ms at ~60fps

    function step(){
      frames++;

      // Semi-transparent fade for trailing effect
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      // Draw characters
      ctx.font = fontSize + 'px monospace';
      for(let i=0; i<drops.length; i++){
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient-ish color: bright near top, green elsewhere
        ctx.fillStyle = (frames % 10 === 0) ? codeGreen : textBright;
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, x, y);

        // Reset drop randomly
        if(y > canvas.height && Math.random() > 0.975){
          drops[i] = 0;
        }
        drops[i]++;
      }

      // Midway: switch theme so the background/body transitions underneath
      if(frames === Math.floor(maxFrames/2)){
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        if(btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
      }

      if(frames < maxFrames){
        rafId = requestAnimationFrame(step);
      } else {
        // Fade-out the overlay, then stop
        overlay.classList.remove('active');
        setTimeout(()=>{
          ctx.clearRect(0,0,canvas.width,canvas.height);
          running = false;
          cancelAnimationFrame(rafId);
          rafId = null;
        }, 250);
      }
    }

    rafId = requestAnimationFrame(step);
  }

  if(btn){
    btn.addEventListener('click', ()=>{
      const current = root.getAttribute('data-theme') || 'light';
      startMatrix({ mode: current === 'light' ? 'to-dark' : 'to-light' });
    });
  }
})();
