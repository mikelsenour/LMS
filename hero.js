(function () {
  const hero = document.getElementById('heroBanner');
  if (!hero) return;

  const slides = Array.from(hero.querySelectorAll('.bg-slide'));
  const dotsBox = document.getElementById('heroDots');
  const toggle = document.getElementById('heroToggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let index = 0;
  let timer = null;
  let playing = !reduceMotion;   // people who ask for less motion get a still background

  const dots = slides.map((s, i) => {
    const d = document.createElement('span');
    d.addEventListener('click', () => { show(i); if (playing) start(); });
    dotsBox.appendChild(d);
    return d;
  });

  function show(i) {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('active', n === index));
    dots.forEach((d, n) => d.classList.toggle('on', n === index));
  }

  function stop() { if (timer) clearInterval(timer); timer = null; }
  function start() { stop(); timer = setInterval(() => show(index + 1), 8000); }

  toggle.addEventListener('click', () => {
    playing = !playing;
    hero.classList.toggle('paused', !playing);
    toggle.textContent = playing ? '\u275A\u275A' : '\u25B6';
    toggle.setAttribute('aria-label', playing ? 'Pause background' : 'Play background');
    if (playing) start(); else stop();
  });

  show(0);
  if (playing) {
    start();
  } else {
    hero.classList.add('paused');
    toggle.textContent = '\u25B6';
  }
})();