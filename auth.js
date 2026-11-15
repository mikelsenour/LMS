const message = document.getElementById('message');

// SIGN UP
document.getElementById('signupBtn').addEventListener('click', async () => {
  const { error } = await db.auth.signUp({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    options: { data: { full_name: document.getElementById('fullName').value } }
  });

  if (error) {
    message.textContent = error.message;
  } else {
    message.textContent = 'Account created! Now click Log in.';
  }
});

// LOG IN
document.getElementById('loginBtn').addEventListener('click', async () => {
  const { error } = await db.auth.signInWithPassword({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value
  });

  if (error) {
    message.textContent = error.message;
  } else {
    window.location.href = 'dashboard.html';
  }
});