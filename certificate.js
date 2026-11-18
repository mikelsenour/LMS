const SCHOOL_NAME = 'THE DS TEST SCHOOL';   // <-- change this to your school's name
const certId = new URLSearchParams(window.location.search).get('id');

async function init() {
  const msg = document.getElementById('msg');

  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  if (!certId) { window.location.href = 'dashboard.html'; return; }

  const { data: c, error } = await db
    .from('certificates')
    .select('certificate_no, course_id, student_name, course_title, final_percent, issued_at')
    .eq('id', certId)
    .single();

  if (error) { msg.textContent = 'Certificate not available: ' + error.message; return; }

  document.getElementById('backLink').href = 'course.html?id=' + c.course_id;
  document.getElementById('schoolName').textContent = SCHOOL_NAME;
  document.getElementById('studentName').textContent = c.student_name;
  document.getElementById('courseTitle').textContent = c.course_title;
  document.getElementById('scoreLine').textContent = 'with a final average of ' + c.final_percent + '%';
  document.getElementById('dateLine').textContent = 'Issued on ' +
    new Date(c.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('certNo').textContent = 'Certificate No: ' + c.certificate_no;
  document.getElementById('cert').style.display = 'block';
}

document.getElementById('printBtn').addEventListener('click', () => window.print());

init();