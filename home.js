(async function () {
  const { data: { session } } = await db.auth.getSession();
  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, description')
    .order('created_at', { ascending: false })
    .limit(6);

  const box = document.getElementById('courseGrid');
  if (error) { box.textContent = 'Could not load courses.'; return; }
  renderCourseCards(box, courses, !!session);
})();