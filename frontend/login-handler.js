// frontend/login-handler.js
document.getElementById && (() => {
  const btn = document.getElementById('btnLogin');
  btn && btn.addEventListener('click', doLogin);
})();

async function doLogin(){
  const user = document.getElementById('username').value?.trim();
  const pass = document.getElementById('password').value?.trim();
  if (!user || !pass) return alert('Enter username & password');

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json().catch(()=>null);
    if (!res.ok) {
      alert(data?.error || 'Login failed');
      return;
    }
    if (data.role === 'teacher') {
      window.location.href = '/admin-dashboard.html';
    } else if (data.role === 'student') {
      window.location.href = `/profile.html?student_id=${data.student_id}`;
    } else {
      window.location.href = '/';
    }
  } catch (err) {
    console.error(err);
    alert('Login error - check server');
  }
}