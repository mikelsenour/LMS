let userId = null;

async function loadCourses() {
  const myBox = document.getElementById('myCourses');
  const availBox = document.getElementById('courseList');
  myBox.innerHTML = '';
  availBox.innerHTML = '';

  const { data: courses, error } = await db
    .from('courses')
    .select('id, title, description, teacher_id')
    .order('created_at', { ascending: false });

  if (error) {
    myBox.textContent = 'Error: ' + error.message;
    return;
  }

  // Which courses have I joined? (.eq keeps it to my own rows only)
  const { data: mine } = await db
    .from('enrollments')
    .select('course_id')
    .eq('student_id', userId);
  const joined = new Set((mine || []).map(e => e.course_id));

  courses.forEach(course => {
    const li = document.createElement('li');
    const isMine = joined.has(course.id) || course.teacher_id === userId;

    if (isMine) {
      const link = document.createElement('a');
      link.href = 'course.html?id=' + course.id;
      link.textContent = course.title;
      li.appendChild(link);
      if (course.description) li.append(' - ' + course.description);
      myBox.appendChild(li);
    } else {
      li.append(course.title + (course.description ? ' - ' + course.description : '') + ' ');
      const btn = document.createElement('button');
      btn.textContent = 'Enrol';
      btn.addEventListener('click', async () => {
        const { error: enrolErr } = await db
          .from('enrollments')
          .insert({ course_id: course.id });
        if (enrolErr) {
          alert('Could not enrol: ' + enrolErr.message);
        } else {
          loadCourses();
        }
      });
      li.appendChild(btn);
      availBox.appendChild(li);
    }
  });

  if (!myBox.children.length) myBox.textContent = 'You have not joined any courses yet.';
  if (!availBox.children.length) availBox.textContent = 'No other courses available.';
}

function makeRow(values, isHeader) {
  const tr = document.createElement('tr');
  values.forEach(v => {
    const cell = document.createElement(isHeader ? 'th' : 'td');
    cell.textContent = v;
    tr.appendChild(cell);
  });
  return tr;
}

async function loadMyResults() {
  const table = document.getElementById('myResults');
  const average = document.getElementById('myAverage');
  table.innerHTML = '';

  // The nested select fetches the exam title and its course title in one request
  const { data: attempts, error } = await db
    .from('attempts')
    .select('score, total_marks, submitted_at, exams(title, courses(title))')
    .eq('student_id', userId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (error) {
    average.textContent = 'Error: ' + error.message;
    return;
  }
  if (attempts.length === 0) {
    average.textContent = 'You have not taken any exams yet.';
    return;
  }

  table.appendChild(makeRow(['Course', 'Exam', 'Score', 'Percent', 'Date'], true));

  let totalPct = 0;
  attempts.forEach(a => {
    const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
    totalPct += pct;
    const exam = a.exams;
    table.appendChild(makeRow([
      exam && exam.courses ? exam.courses.title : '-',
      exam ? exam.title : 'Exam',
      a.score + ' / ' + a.total_marks,
      pct + '%',
      new Date(a.submitted_at).toLocaleDateString()
    ], false));
  });

  average.textContent = 'Exams taken: ' + attempts.length +
    ' | Overall average: ' + Math.round(totalPct / attempts.length) + '%';
}

async function loadDashboard() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }
  userId = session.user.id;

  const { data: profile, error } = await db
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .single();

  if (error) {
    document.getElementById('welcome').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('welcome').textContent = 'Welcome, ' + profile.full_name;
  document.getElementById('roleText').textContent = 'You are logged in as a ' + profile.role;

  if (profile.role === 'teacher' || profile.role === 'admin') {
    document.getElementById('teacherPanel').style.display = 'block';
  }

  if (profile.role === 'student') {
    document.getElementById('studentResults').style.display = 'block';
    loadMyResults();
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