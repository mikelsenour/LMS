const examId = new URLSearchParams(window.location.search).get('exam');
const PASS_MARK = 50;   // percent needed to pass; change if your school uses another

function makeRow(values, isHeader) {
  const tr = document.createElement('tr');
  values.forEach(v => {
    const cell = document.createElement(isHeader ? 'th' : 'td');
    cell.textContent = v;
    tr.appendChild(cell);
  });
  return tr;
}

function percent(score, total) {
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

async function init() {
  const msg = document.getElementById('msg');

  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  if (!examId) { window.location.href = 'dashboard.html'; return; }

  const { data: exam, error } = await db
    .from('exams')
    .select('title, course_id')
    .eq('id', examId)
    .single();
  if (error) { msg.textContent = 'Error: ' + error.message; return; }

  document.getElementById('pageTitle').textContent = 'Results: ' + exam.title;
  document.getElementById('backLink').href = 'course.html?id=' + exam.course_id;

  // Fetch the three sets of data at the same time
  const [enrRes, attRes, statRes] = await Promise.all([
    db.from('enrollments').select('student_id').eq('course_id', exam.course_id),
    db.from('attempts').select('student_id, score, total_marks, submitted_at').eq('exam_id', examId),
    db.rpc('exam_question_stats', { p_exam_id: examId })
  ]);

  if (enrRes.error || attRes.error) {
    msg.textContent = 'Error: ' + (enrRes.error || attRes.error).message;
    return;
  }

  const enrolled = (enrRes.data || []).map(e => e.student_id);
  const attempts = attRes.data || [];

  // Everyone enrolled or who attempted
  const ids = [...new Set([...enrolled, ...attempts.map(a => a.student_id)])];

  // Their names
  const names = {};
  if (ids.length > 0) {
    const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', ids);
    (profiles || []).forEach(p => { names[p.id] = p.full_name; });
  }

  const attemptByStudent = {};
  attempts.forEach(a => { attemptByStudent[a.student_id] = a; });

  // Build one record per student
  const students = ids.map(id => {
    const a = attemptByStudent[id];
    let status = 'Not taken';
    let pct = null;
    if (a && a.submitted_at) {
      status = 'Submitted';
      pct = percent(a.score, a.total_marks);
    } else if (a) {
      status = 'In progress';
    }
    return { name: names[id] || 'Unknown', attempt: a, status: status, pct: pct };
  });

  // Submitted first (best score first), then the rest by name
  students.sort((x, y) => {
    if (x.pct !== null && y.pct !== null) return y.pct - x.pct;
    if (x.pct !== null) return -1;
    if (y.pct !== null) return 1;
    return x.name.localeCompare(y.name);
  });

  const submitted = students.filter(s => s.pct !== null);

  // SUMMARY
  const summary = document.getElementById('summary');
  function addLine(text) {
    const li = document.createElement('li');
    li.textContent = text;
    summary.appendChild(li);
  }
  addLine('Students in course: ' + students.length);
  addLine('Submitted: ' + submitted.length);
  if (submitted.length > 0) {
    const pcts = submitted.map(s => s.pct);
    const avg = Math.round(pcts.reduce((sum, p) => sum + p, 0) / pcts.length);
    addLine('Average: ' + avg + '%');
    addLine('Highest: ' + Math.max(...pcts) + '%');
    addLine('Lowest: ' + Math.min(...pcts) + '%');
    addLine('Passed (' + PASS_MARK + '% or more): ' + pcts.filter(p => p >= PASS_MARK).length +
            ' of ' + pcts.length);
  } else {
    addLine('No one has submitted yet.');
  }

  // CHART
  if (submitted.length > 0 && typeof Chart !== 'undefined') {
    new Chart(document.getElementById('scoreChart'), {
      type: 'bar',
      data: {
        labels: submitted.map(s => s.name),
        datasets: [{ label: 'Score (%)', data: submitted.map(s => s.pct) }]
      },
      options: { scales: { y: { min: 0, max: 100 } } }
    });
  }

  // STUDENT TABLE
  const table = document.getElementById('studentTable');
  table.appendChild(makeRow(['Student', 'Score', 'Percent', 'Status'], true));
  students.forEach(s => {
    const done = s.pct !== null;
    table.appendChild(makeRow([
      s.name,
      done ? s.attempt.score + ' / ' + s.attempt.total_marks : '-',
      done ? s.pct + '%' : '-',
      s.status
    ], false));
  });

  // QUESTION ANALYSIS
  const qTable = document.getElementById('questionTable');
  qTable.appendChild(makeRow(['#', 'Question', 'Correct', 'Note'], true));
  if (statRes.error) {
    msg.textContent = 'Could not load question analysis: ' + statRes.error.message;
  } else {
    (statRes.data || []).forEach(q => {
      const pct = q.answered > 0 ? Math.round((q.correct / q.answered) * 100) : null;
      let note = '';
      if (pct !== null && pct < 40) note = 'Hard - consider re-teaching';
      qTable.appendChild(makeRow([
        q.qpos,
        q.question_text,
        pct === null ? '-' : pct + '% (' + q.correct + ' of ' + q.answered + ')',
        note
      ], false));
    });
  }
}

init();