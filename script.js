
// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}) }
  });
});

// Theme toggle with persistence
const themeBtn = document.getElementById('themeToggle');
if(themeBtn){
  const stored = localStorage.getItem('theme') || 'dark';
  document.documentElement.dataset.theme = stored;
  themeBtn.textContent = stored === 'dark' ? '☀️ Light' : '🌙 Dark';
  themeBtn.addEventListener('click', ()=>{
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('theme', t);
    themeBtn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
  });
}
