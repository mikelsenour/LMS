const SITE_NAME = 'Theds1 Learning';          // <-- shown beside the logo and in the footer
const SITE_TAGLINE = 'Online Learning Platform';

(async function buildSiteChrome() {
  const { data: { session } } = await db.auth.getSession();
  const current = window.location.pathname.split('/').pop() || 'index.html';

  // Browser tab icon and phone home-screen icon
  [['icon', 'favicon.png'], ['apple-touch-icon', 'apple-touch-icon.png']].forEach(([rel, href]) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  });

  // ----- slim dark bar with quick links -----
  const topBar = document.createElement('div');
  topBar.className = 'top-bar';
  const topInner = document.createElement('div');
  topInner.className = 'bar-inner';
  [
    [session ? 'dashboard.html' : 'auth.html', session ? 'My Dashboard' : 'Student Portal'],
    ['courses.html', 'Courses'],
    ['help.html', 'Help'],
    ['about.html', 'Contact']
  ].forEach(([href, label]) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    topInner.appendChild(a);
  });
  topBar.appendChild(topInner);

  // ----- main white header -----
  const header = document.createElement('header');
  header.className = 'site-nav';
  const inner = document.createElement('div');
  inner.className = 'nav-inner';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = 'index.html';

  const logo = document.createElement('img');
  logo.src = 'logo.png';
  logo.alt = SITE_NAME;
  logo.className = 'brand-logo';
  logo.onerror = () => logo.remove();     // no logo file? the text still shows
  brand.appendChild(logo);

  const text = document.createElement('span');
  text.className = 'brand-text';
  const strong = document.createElement('strong');
  strong.textContent = SITE_NAME;
  const small = document.createElement('small');
  small.textContent = SITE_TAGLINE;
  text.append(strong, small);
  brand.appendChild(text);
  inner.appendChild(brand);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn';
  menuBtn.textContent = '\u2630';
  menuBtn.setAttribute('aria-label', 'Menu');
  inner.appendChild(menuBtn);

  const links = [
    ['index.html', 'Home'],
    ['courses.html', 'Courses'],
    ['about.html', 'About'],
    ['help.html', 'Help']
  ];
  if (session) links.push(['dashboard.html', 'My Dashboard']);

  const nav = document.createElement('nav');
  links.forEach(([href, label]) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (current === href) a.className = 'active';
    nav.appendChild(a);
  });

  if (session) {
    const out = document.createElement('a');
    out.href = '#';
    out.textContent = 'Log out';
    out.addEventListener('click', async (e) => {
      e.preventDefault();
      await db.auth.signOut();
      window.location.href = 'index.html';
    });
    nav.appendChild(out);
  } else {
    const inn = document.createElement('a');
    inn.href = 'auth.html';
    inn.textContent = 'Log in / Sign up';
    if (current === 'auth.html') inn.className = 'active';
    nav.appendChild(inn);
  }
  inner.appendChild(nav);

  menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
  header.appendChild(inner);

  document.body.prepend(header);
  document.body.prepend(topBar);

  // ----- footer -----
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.textContent = '\u00A9 ' + new Date().getFullYear() + ' ' + SITE_NAME + ' \u00B7 ';
  [['courses.html', 'Courses'], ['about.html', 'About'], ['help.html', 'Help'],
   [session ? 'dashboard.html' : 'auth.html', session ? 'Dashboard' : 'Log in']].forEach(([href, label], i) => {
    if (i > 0) footer.append(' \u00B7 ');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    footer.appendChild(a);
  });
  document.body.appendChild(footer);
})();

// Shared helper: draws course cards (used by the home page and the catalogue)
function renderCourseCards(box, courses, isLoggedIn) {
  box.innerHTML = '';
  if (courses.length === 0) {
    box.textContent = 'No courses found.';
    return;
  }
  courses.forEach(course => {
    const card = document.createElement('div');
    card.className = 'course-card';

    const h = document.createElement('h3');
    h.textContent = course.title;
    card.appendChild(h);

    const p = document.createElement('p');
    const d = course.description || 'No description yet.';
    p.textContent = d.length > 110 ? d.slice(0, 110) + '...' : d;
    card.appendChild(p);

    const a = document.createElement('a');
    a.className = 'btn';
    a.href = isLoggedIn ? 'dashboard.html' : 'auth.html';
    a.textContent = isLoggedIn ? 'Go to my dashboard' : 'Log in to enrol';
    card.appendChild(a);

    box.appendChild(card);
  });
}