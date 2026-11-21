const SITE_NAME = 'My LMS';   // <-- change to your school or platform name

(async function buildSiteChrome() {
  const { data: { session } } = await db.auth.getSession();
  const current = window.location.pathname.split('/').pop() || 'index.html';

  const links = [
    ['index.html', 'Home'],
    ['courses.html', 'Courses'],
    ['about.html', 'About'],
    ['help.html', 'Help']
  ];
  if (session) links.push(['dashboard.html', 'My Dashboard']);

  // ----- top menu -----
  const header = document.createElement('header');
  header.className = 'site-nav';

  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = 'index.html';

  const logo = document.createElement('img');
  logo.src = 'logo.png';
  logo.alt = '';
  logo.className = 'brand-logo';
  logo.onerror = () => logo.remove();   // no logo file yet? just hide it
  brand.appendChild(logo);
  brand.append(SITE_NAME);
  header.appendChild(brand);

  // Use the logo as the browser tab icon too
  const icon = document.createElement('link');
  icon.rel = 'icon';
  icon.href = 'logo.png';
  document.head.appendChild(icon);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'menu-btn';
  menuBtn.textContent = '\u2630';            // the three-line menu icon
  menuBtn.setAttribute('aria-label', 'Menu');
  header.appendChild(menuBtn);

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
  header.appendChild(nav);

  menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
  document.body.prepend(header);

  // ----- footer -----
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.textContent = '\u00A9 ' + new Date().getFullYear() + ' ' + SITE_NAME + ' \u00B7 ';
    [['courses.html', 'Courses'], ['about.html', 'About'], ['help.html', 'Help'],,
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