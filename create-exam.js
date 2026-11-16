const params = new URLSearchParams(window.location.search);
const courseId = params.get('course');
const examId = params.get('exam');
let questionCount = 0;

async function loadQuestions() {
  const list = document.getElementById('questionList');
  list.innerHTML = '';

  const { data: questions, error } = await db
    .from('questions')
    .select('id, position, question_text, option_a, option_b, option_c, option_d, marks')
    .eq('exam_id', examId)
    .order('position', { ascending: true });

  if (error) {
    list.textContent = 'Error: ' + error.message;
    return;
  }
  questionCount = questions.length;
  if (questions.length === 0) {
    list.textContent = 'No questions yet.';
    return;
  }

  // The teacher can read the answer key (students cannot)
  const { data: keys } = await db
    .from('question_keys')
    .select('question_id, correct_option')
    .in('question_id', questions.map(q => q.id));
  const keyMap = {};
  (keys || []).forEach(k => { keyMap[k.question_id] = k.correct_option; });

  questions.forEach(q => {
    const li = document.createElement('li');
    const correct = (keyMap[q.id] || '?').toUpperCase();
    li.textContent = q.question_text +
      '  [A] ' + q.option_a + '  [B] ' + q.option_b +
      '  [C] ' + q.option_c + '  [D] ' + q.option_d +
      '  | Correct: ' + correct + ' | Marks: ' + q.marks;
    list.appendChild(li);
  });
}

async function init() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'auth.html'; return; }
  if (!courseId) { window.location.href = 'dashboard.html'; return; }

  document.getElementById('backLink').href = 'course.html?id=' + courseId;

  // Stage 1: no exam yet
  if (!examId) {
    document.getElementById('newExamPanel').style.display = 'block';
    return;
  }

  // Stage 2: exam exists
  const { data: exam, error } = await db
    .from('exams')
    .select('title, published')
    .eq('id', examId)
    .single();
  if (error) {
    document.getElementById('pageTitle').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('pageTitle').textContent = exam.title;
  if (exam.published) {
    document.getElementById('publishedNote').style.display = 'block';
  } else {
    document.getElementById('questionPanel').style.display = 'block';
  }
  loadQuestions();
}

document.getElementById('createExamBtn').addEventListener('click', async () => {
  const msg = document.getElementById('examMsg');
  const title = document.getElementById('examTitle').value.trim();
  const duration = parseInt(document.getElementById('examDuration').value, 10);

  if (!title || !duration) {
    msg.textContent = 'Please enter a title and the number of minutes.';
    return;
  }

  const { data, error } = await db
    .from('exams')
    .insert({ course_id: courseId, title: title, duration_minutes: duration })
    .select('id')
    .single();

  if (error) {
    msg.textContent = 'Error: ' + error.message;
  } else {
    window.location.href = 'create-exam.html?course=' + courseId + '&exam=' + data.id;
  }
});

document.getElementById('addQuestionBtn').addEventListener('click', async () => {
  const msg = document.getElementById('qMsg');
  const text = document.getElementById('qText').value.trim();
  const a = document.getElementById('optA').value.trim();
  const b = document.getElementById('optB').value.trim();
  const c = document.getElementById('optC').value.trim();
  const d = document.getElementById('optD').value.trim();
  const correct = document.getElementById('qCorrect').value;
  const marks = parseInt(document.getElementById('qMarks').value, 10) || 1;

  if (!text || !a || !b || !c || !d) {
    msg.textContent = 'Please fill in the question and all four options.';
    return;
  }

  // 1. Save the question
  const { data: q, error } = await db
    .from('questions')
    .insert({
      exam_id: examId, position: questionCount + 1,
      question_text: text, option_a: a, option_b: b, option_c: c, option_d: d,
      marks: marks
    })
    .select('id')
    .single();
  if (error) { msg.textContent = 'Error: ' + error.message; return; }

  // 2. Save its secret answer in the locked table
  const { error: keyErr } = await db
    .from('question_keys')
    .insert({ question_id: q.id, correct_option: correct });
  if (keyErr) {
    await db.from('questions').delete().eq('id', q.id); // undo, so no question lacks an answer
    msg.textContent = 'Error saving answer: ' + keyErr.message;
    return;
  }

  msg.textContent = 'Question added!';
  ['qText', 'optA', 'optB', 'optC', 'optD'].forEach(id => {
    document.getElementById(id).value = '';
  });
  loadQuestions();
});

document.getElementById('publishBtn').addEventListener('click', async () => {
  const msg = document.getElementById('publishMsg');
  if (questionCount === 0) {
    msg.textContent = 'Add at least one question first.';
    return;
  }
  if (!confirm('Publish now? You cannot add questions after publishing.')) return;

  const { error } = await db.from('exams').update({ published: true }).eq('id', examId);
  if (error) {
    msg.textContent = 'Error: ' + error.message;
  } else {
    window.location.reload();
  }
});

init();