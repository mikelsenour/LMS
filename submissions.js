const assignmentId = new URLSearchParams(window.location.search).get('id');
let assignment = null;

function buildCard(sub, name, fileUrl) {
  const div = document.createElement('div');
  div.style.border = '1px solid #999';
  div.style.padding = '12px';
  div.style.marginBottom = '16px';

  const heading = document.createElement('h3');
  heading.textContent = name;
  div.appendChild(heading);

  const late = assignment.due_at && new Date(sub.submitted_at) > new Date(assignment.due_at);
  const status = document.createElement('p');
  status.textContent = 'Submitted ' + new Date(sub.submitted_at).toLocaleString() +
    (late ? ' (LATE)' : '') +
    (sub.marks !== null ? ' - Marked' : ' - Not marked yet');
  div.appendChild(status);

  if (fileUrl) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = fileUrl;
    a.target = '_blank';
    a.textContent = 'Open submitted file';
    p.appendChild(a);
    div.appendChild(p);
  }

  // Marks
  const marksInput = document.createElement('input');
  marksInput.type = 'number';
  marksInput.min = '0';
  marksInput.max = String(assignment.max_marks);
  marksInput.style.width = '70px';
  marksInput.value = sub.marks !== null ? sub.marks : '';
  const marksLabel = document.createElement('p');
  marksLabel.append('Marks: ');
  marksLabel.appendChild(marksInput);
  marksLabel.append(' / ' + assignment.max_marks);
  div.appendChild(marksLabel);

  // Feedback
  const feedback = document.createElement('textarea');
  feedback.placeholder = 'Feedback for the student';
  feedback.rows = 3;
  feedback.style.width = '100%';
  feedback.style.maxWidth = '500px';
  feedback.value = sub.feedback || '';
  div.appendChild(feedback);
  div.appendChild(document.createElement('br'));

  // Save
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save marks';
  const note = document.createElement('p');

  saveBtn.addEventListener('click', async () => {
    const raw = marksInput.value.trim();
    let marks = null;   // leaving the box empty un-marks it, so the student can resubmit

    if (raw !== '') {
      marks = parseInt(raw, 10);
      if (isNaN(marks) || marks < 0 || marks > assignment.max_marks) {
        note.textContent = 'Marks must be between 0 and ' + assignment.max_marks + '.';
        return;
      }
    }

    const { data, error } = await db
      .from('submissions')
      .update({
        marks: marks,
        feedback: feedback.value.trim() || null,
        graded_at: marks === null ? null : new Date().toISOString()
      })
      .eq('id', sub.id)
      .select('id');

    if (error) {
      note.textContent = 'Error: ' + error.message;
    } else if (!data || data.length === 0) {
      note.textContent = 'Not saved (you may not have permission).';
    } else {
      note.textContent = marks === null ? 'Marks cleared.' : 'Saved!';
    }
  });

  div.appendChild(saveBtn);
  div.appendChild(note);
  return div;
}

async function init() {
  const msg = document.getElementById('msg');

  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  if (!assignmentId) { window.location.href = 'dashboard.html'; return; }

  const { data: a, error } = await db
    .from('assignments')
    .select('title, due_at, max_marks, course_id')
    .eq('id', assignmentId)
    .single();
  if (error) { msg.textContent = 'Error: ' + error.message; return; }
  assignment = a;

  document.getElementById('pageTitle').textContent = 'Submissions: ' + a.title;
  document.getElementById('backLink').href = 'course.html?id=' + a.course_id;

  const [enrRes, subRes] = await Promise.all([
    db.from('enrollments').select('student_id').eq('course_id', a.course_id),
    db.from('submissions')
      .select('id, student_id, file_path, submitted_at, marks, feedback')
      .eq('assignment_id', assignmentId)
  ]);
  if (enrRes.error || subRes.error) {
    msg.textContent = 'Error: ' + (enrRes.error || subRes.error).message;
    return;
  }

  const enrolled = (enrRes.data || []).map(e => e.student_id);
  const subs = subRes.data || [];
  const ids = [...new Set([...enrolled, ...subs.map(s => s.student_id)])];

  // Student names
  const names = {};
  if (ids.length > 0) {
    const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', ids);
    (profiles || []).forEach(p => { names[p.id] = p.full_name; });
  }

  // Temporary links to the private files
  const urlMap = {};
  if (subs.length > 0) {
    const { data: signed } = await db.storage
      .from('submissions')
      .createSignedUrls(subs.map(s => s.file_path), 3600);
    (signed || []).forEach(item => { urlMap[item.path] = item.signedUrl; });
  }

  subs.sort((x, y) => (names[x.student_id] || '').localeCompare(names[y.student_id] || ''));

  const markedCount = subs.filter(s => s.marks !== null).length;
  document.getElementById('summary').textContent =
    'Submitted: ' + subs.length + ' of ' + ids.length +
    ' students | Marked: ' + markedCount + ' | Out of ' + assignment.max_marks;

  const cards = document.getElementById('cards');
  if (subs.length === 0) cards.textContent = 'No submissions yet.';
  subs.forEach(s => {
    cards.appendChild(buildCard(s, names[s.student_id] || 'Unknown', urlMap[s.file_path]));
  });

  // Students who have not submitted
  const submittedIds = new Set(subs.map(s => s.student_id));
  const missing = document.getElementById('missing');
  const notDone = ids.filter(id => !submittedIds.has(id));
  if (notDone.length === 0) missing.textContent = 'Everyone has submitted.';
  notDone.forEach(id => {
    const li = document.createElement('li');
    li.textContent = names[id] || 'Unknown';
    missing.appendChild(li);
  });
}

init();