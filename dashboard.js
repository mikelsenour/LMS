async function loadCourses() {
  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, description')
    .order('created_at', { ascending: false });

  const list = document.getElementById('courseList');
  list.innerHTML = '';

  if (error) {
    list.textContent = 'Error: ' + error.message;
    return;
  }
  if (courses.length === 0) {
    list.textContent = 'No courses yet.';
    return;
  }

  courses.forEach(course => {
    const li = document.createElement('li');
    // textContent (not innerHTML) keeps user-typed text safe
    li.textContent = course.title + (course.description ? ' - ' + course.description : '');
    list.appendChild(li);
  });
}

async function loadDashboard() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }

  const { data: profile, error } = await db
    .from('profiles')
    .select('full_name, role')
    .eq('id', session.user.id)
    .single();

  if (error) {
    document.getElementById('welcome').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('welcome').textContent = 'Welcome, ' + profile.full_name;
  document.getElementById('roleText').textContent = 'You are logged in as a ' + profile.role;

  // Show the create-course form only to teachers/admins
  if (profile.role === 'teacher' || profile.role === 'admin') {
    document.getElementById('teacherPanel').style.display = 'block';
  }

  loadCourses();
}

document.getElementById('createCourseBtn').addEventListener('click', async () => {
  const title = document.getElementById('courseTitle').value.trim();
  const description = document.getElementById('courseDesc').value.trim();
  const msg = document.getElementById('courseMessage');

  if (!title) {
    msg.textContent = 'Please enter a course title.';
    return;
  }

  const { error } = await db.from('courses').insert({ title, description });

  if (error) {
    msg.textContent = 'Error: ' + error.message;
  } else {
    msg.textContent = 'Course created!';
    document.getElementById('courseTitle').value = '';
    document.getElementById('courseDesc').value = '';
    loadCourses();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'auth.html';
});

loadDashboard();