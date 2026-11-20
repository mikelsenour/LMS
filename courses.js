(async function () {
  const { data: { session } } = await db.auth.getSession();
  const box = document.getElementById('courseGrid');

  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, description')
    .order('title', { ascending: true });

  if (error) { box.textContent = 'Could not load courses.'; return; }

  renderCourseCards(box, courses, !!session);

  // Filter as the visitor types
  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const shown = courses.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q));
    renderCourseCards(box, shown, !!session);
  });
})();