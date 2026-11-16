const courseId = new URLSearchParams(window.location.search).get('id');
let currentUserId = null;

async function loadMaterials() {
  const list = document.getElementById('materialList');
  list.innerHTML = '';

  const { data: materials, error } = await db
    .from('materials')
    .select('id, title, file_path')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    list.textContent = 'Error: ' + error.message;
    return;
  }
  if (materials.length === 0) {
    list.textContent = 'No materials yet.';
    return;
  }

  // Private files need a temporary link (valid 1 hour)
  const { data: signed } = await db.storage
    .from('course-files')
    .createSignedUrls(materials.map(m => m.file_path), 3600);

  materials.forEach((m, i) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.textContent = m.title;
    a.href = signed[i].signedUrl;
    a.target = '_blank';
    li.appendChild(a);
    list.appendChild(li);
  });
}

async function loadPage() {
  if (!courseId) {
    window.location.href = 'dashboard.html';
    return;
  }

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';
    return;
  }
  currentUserId = session.user.id;

  const { data: course, error } = await db
    .from('courses')
    .select('title, description, teacher_id')
    .eq('id', courseId)
    .single();

  if (error) {
    document.getElementById('courseTitle').textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('courseTitle').textContent = course.title;
  document.getElementById('courseDesc').textContent = course.description || '';

  // Show the upload form only to the teacher who owns this course
  if (course.teacher_id === currentUserId) {
    document.getElementById('teacherPanel').style.display = 'block';
    document.getElementById('createExamLink').href = 'create-exam.html?course=' + courseId;
  }

  loadMaterials();

  loadMaterials();
  loadVideos();
}

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const msg = document.getElementById('uploadMsg');
  const title = document.getElementById('matTitle').value.trim();
  const file = document.getElementById('matFile').files[0];

  if (!title || !file) {
    msg.textContent = 'Please enter a title and choose a PDF.';
    return;
  }
  if (file.type !== 'application/pdf') {
    msg.textContent = 'Only PDF files are allowed.';
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    msg.textContent = 'File is too big (limit is 50 MB on the free plan).';
    return;
  }

  msg.textContent = 'Uploading...';

  // Clean the file name and put it inside a folder named after the course
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = courseId + '/' + Date.now() + '-' + safeName;

  // 1. Upload the file to storage
  const { error: upErr } = await db.storage.from('course-files').upload(path, file);
  if (upErr) {
    msg.textContent = 'Upload failed: ' + upErr.message;
    return;
  }

  // 2. Record it in the materials table
  const { error: dbErr } = await db.from('materials').insert({
    course_id: courseId,
    title: title,
    file_path: path
  });
  if (dbErr) {
    msg.textContent = 'Saved file but could not record it: ' + dbErr.message;
    return;
  }

  msg.textContent = 'Uploaded!';
  document.getElementById('matTitle').value = '';
  document.getElementById('matFile').value = '';
  loadMaterials();
});

// Pull the 11-character ID out of any normal YouTube link
function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

async function loadVideos() {
  const box = document.getElementById('videoList');
  box.innerHTML = '';

  const { data: videos, error } = await db
    .from('videos')
    .select('id, title, youtube_id')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  if (error) {
    box.textContent = 'Error: ' + error.message;
    return;
  }
  if (videos.length === 0) {
    box.textContent = 'No videos yet.';
    return;
  }

  videos.forEach(v => {
    const wrap = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = v.title;

    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + v.youtube_id;
    frame.width = '560';
    frame.height = '315';
    frame.style.maxWidth = '100%';
    frame.allowFullscreen = true;
    frame.setAttribute('allow', 'encrypted-media; picture-in-picture');

    wrap.append(heading, frame);
    box.appendChild(wrap);
  });
}

document.getElementById('videoBtn').addEventListener('click', async () => {
  const msg = document.getElementById('videoMsg');
  const title = document.getElementById('vidTitle').value.trim();
  const youtubeId = extractYouTubeId(document.getElementById('vidUrl').value.trim());

  if (!title) {
    msg.textContent = 'Please enter a title.';
    return;
  }
  if (!youtubeId) {
    msg.textContent = 'That does not look like a YouTube link.';
    return;
  }

  const { error } = await db.from('videos').insert({
    course_id: courseId,
    title: title,
    youtube_id: youtubeId
  });

  if (error) {
    msg.textContent = 'Error: ' + error.message;
  } else {
    msg.textContent = 'Video added!';
    document.getElementById('vidTitle').value = '';
    document.getElementById('vidUrl').value = '';
    loadVideos();
  }
});
loadPage();