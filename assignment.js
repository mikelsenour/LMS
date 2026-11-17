const assignmentId = new URLSearchParams(window.location.search).get('id');
const ALLOWED = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
let userId = null;
let assignment = null;

function addLine(parent, text) {
  const p = document.createElement('p');
  p.textContent = text;
  parent.appendChild(p);
  return p;
}

async function loadSubmission() {
  const info = document.getElementById('submissionInfo');
  const panel = document.getElementById('uploadPanel');
  info.innerHTML = '';

  const { data: sub, error } = await db
    .from('submissions')
    .select('file_path, submitted_at, marks, feedback')
    .eq('assignment_id', assignmentId)
    .eq('student_id', userId)
    .maybeSingle();

  if (error) { info.textContent = 'Error: ' + error.message; return; }

  if (!sub) {
    addLine(info, 'You have not submitted yet.');
    document.getElementById('submitBtn').textContent = 'Submit';
    panel.style.display = 'block';
    return;
  }

  const late = assignment.due_at && new Date(sub.submitted_at) > new Date(assignment.due_at);
  addLine(info, 'Submitted on ' + new Date(sub.submitted_at).toLocaleString() + (late ? ' (late)' : ''));

  // Private file: make a temporary link valid for 1 hour
  const { data: signed } = await db.storage.from('submissions').createSignedUrl(sub.file_path, 3600);
  if (signed) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = signed.signedUrl;
    a.target = '_blank';
    a.textContent = 'Open my submitted file';
    p.appendChild(a);
    info.appendChild(p);
  }

  if (sub.marks !== null) {
    addLine(info, 'Marks: ' + sub.marks + ' / ' + assignment.max_marks);
    if (sub.feedback) addLine(info, 'Feedback: ' + sub.feedback);
    panel.style.display = 'none';
  } else {
    addLine(info, 'Not marked yet. You can replace your file until it is marked.');
    document.getElementById('submitBtn').textContent = 'Replace submission';
    panel.style.display = 'block';
  }
}

async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  userId = session.user.id;
  if (!assignmentId) { window.location.href = 'dashboard.html'; return; }

  const { data, error } = await db
    .from('assignments')
    .select('title, description, due_at, max_marks, course_id')
    .eq('id', assignmentId)
    .single();
  if (error) {
    document.getElementById('asTitle').textContent = 'Assignment not available';
    document.getElementById('msg').textContent = error.message;
    return;
  }
  assignment = data;

  document.getElementById('asTitle').textContent = assignment.title;
  document.getElementById('asDescription').textContent = assignment.description || '';
  document.getElementById('asDue').textContent =
    (assignment.due_at ? 'Due: ' + new Date(assignment.due_at).toLocaleString() : 'No due date') +
    ' | Out of ' + assignment.max_marks;
  document.getElementById('backLink').href = 'course.html?id=' + assignment.course_id;

  loadSubmission();
}

document.getElementById('submitBtn').addEventListener('click', async () => {
  const msg = document.getElementById('msg');
  const file = document.getElementById('subFile').files[0];

  if (!file) { msg.textContent = 'Please choose a file first.'; return; }
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED.includes(ext)) { msg.textContent = 'That file type is not allowed.'; return; }
  if (file.size > 10 * 1024 * 1024) { msg.textContent = 'File is too big (maximum 10 MB).'; return; }

  msg.textContent = 'Uploading...';
  document.getElementById('submitBtn').disabled = true;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = assignmentId + '/' + userId + '/' + Date.now() + '-' + safeName;

  // 1. Upload the file
  const { error: upErr } = await db.storage.from('submissions').upload(path, file);
  if (upErr) {
    msg.textContent = 'Upload failed: ' + upErr.message;
    document.getElementById('submitBtn').disabled = false;
    return;
  }

  // 2. Record the submission (the server sets the time and checks everything)
  const { data: result, error } = await db.rpc('submit_assignment', {
    p_assignment_id: assignmentId,
    p_file_path: path
  });

  document.getElementById('submitBtn').disabled = false;
  if (error) {
    msg.textContent = 'Could not submit: ' + error.message;
  } else {
    msg.textContent = result.late ? 'Submitted (marked as late).' : 'Submitted successfully!';
    document.getElementById('subFile').value = '';
    loadSubmission();
  }
});

init();