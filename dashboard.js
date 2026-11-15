async function loadDashboard() {
  // 1. Is someone logged in?
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'auth.html';  // not logged in, send to login
    return;
  }

  // 2. Get this person's name and role
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
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'auth.html';
});

loadDashboard();