const examId = new URLSearchParams(window.location.search).get('exam');
let userId = null;
let attemptId = null;
let timerId = null;
let finished = false;
let serverOffset = 0;   // how far the student's clock is from the server's
let examInfo = null;

function show(id, yes) {
  document.getElementById(id).style.display = yes ? 'block' : 'none';
}

function showResult(score, total) {
  show('intro', false);
  show('examBox', false);
  show('resultBox', true);
  document.getElementById('timer').textContent = '';
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  document.getElementById('resultText').textContent =
    'Score: ' + score + ' / ' + total + ' (' + pct + '%)';
}

async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  userId = session.user.id;

  if (!examId) { window.location.href = 'dashboard.html'; return; }

  const { data: exam, error } = await db
    .from('exams')
    .select('title, duration_minutes, course_id')
    .eq('id', examId)
    .single();
  if (error) {
    document.getElementById('examTitle').textContent = 'Exam not available';
    document.getElementById('msg').textContent = error.message;
    return;
  }
  examInfo = exam;
  document.getElementById('examTitle').textContent = exam.title;
  document.getElementById('backLink').href = 'course.html?id=' + exam.course_id;

  // Already taken?
  const { data: attempt } = await db
    .from('attempts')
    .select('submitted_at, score, total_marks')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .maybeSingle();

  if (attempt && attempt.submitted_at) {
    showResult(attempt.score, attempt.total_marks);
    return;
  }

  document.getElementById('introText').textContent =
    'You have ' + exam.duration_minutes + ' minutes. The timer starts when you click Start ' +
    'and cannot be paused. You can take this exam only once.' +
    (attempt ? ' (You already started it, so the clock is still running.)' : '');
  show('intro', true);
}

async function startExam() {
  const msg = document.getElementById('msg');
  msg.textContent = '';

  const { data: started, error } = await db.rpc('start_exam', { p_exam_id: examId });
  if (error) { msg.textContent = error.message; return; }
  attemptId = started.attempt_id;

  // Sync with the server's clock
  const { data: serverNow } = await db.rpc('server_time');
  if (serverNow) serverOffset = new Date(serverNow).getTime() - Date.now();

  const { data: questions, error: qErr } = await db
    .from('questions')
    .select('id, question_text, option_a, option_b, option_c, option_d')
    .eq('exam_id', examId)
    .order('position', { ascending: true });
  if (qErr) { msg.textContent = qErr.message; return; }

  const box = document.getElementById('questions');
  box.innerHTML = '';
  questions.forEach((q, i) => {
    const div = document.createElement('div');
    const p = document.createElement('p');
    p.textContent = (i + 1) + '. ' + q.question_text;
    div.appendChild(p);

    ['a', 'b', 'c', 'd'].forEach(letter => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = q.id;
      radio.value = letter;
      label.appendChild(radio);
      label.append(' ' + letter.toUpperCase() + '. ' + q['option_' + letter]);
      div.appendChild(label);
      div.appendChild(document.createElement('br'));
    });
    box.appendChild(div);
  });

  show('intro', false);
  show('examBox', true);

  const endTime = new Date(started.started_at).getTime() + started.duration_minutes * 60000;

  function tick() {
    const remaining = endTime - (Date.now() + serverOffset);
    if (remaining <= 0) {
      document.getElementById('timer').textContent = 'Time is up!';
      submitExam(true);
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    document.getElementById('timer').textContent =
      'Time left: ' + m + ':' + String(s).padStart(2, '0');
  }
  tick();
  timerId = setInterval(tick, 1000);
}

async function submitExam(auto) {
  if (finished) return;
  finished = true;
  clearInterval(timerId);
  document.getElementById('submitBtn').disabled = true;

  // Collect the chosen answers: { questionId: 'a' | 'b' | 'c' | 'd' }
  const answers = {};
  document.querySelectorAll('#questions input[type=radio]:checked').forEach(r => {
    answers[r.name] = r.value;
  });

  const { data, error } = await db.rpc('submit_exam', {
    p_attempt_id: attemptId,
    p_answers: answers
  });

  if (error) {
    document.getElementById('msg').textContent = 'Could not submit: ' + error.message;
    finished = false;
    document.getElementById('submitBtn').disabled = false;
  } else {
    showResult(data.score, data.total);
  }
}

document.getElementById('startBtn').addEventListener('click', startExam);
document.getElementById('submitBtn').addEventListener('click', () => {
  if (confirm('Submit your answers now? You cannot change them afterwards.')) {
    submitExam(false);
  }
});

init();