import { loginRequest } from '../api/authApi.js';
import { setAuth, isAuthenticated } from '../utils/authStorage.js';

if (isAuthenticated()) {
  window.location.href = 'index.html';
}

const loginForm = document.getElementById('loginForm');
const emailOrUsernameInput = document.getElementById('emailOrUsername');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submitBtn');
const authAlert = document.getElementById('authAlert');

function showAlert(message, type = 'danger') {
  authAlert.className = `alert alert-${type}`;
  authAlert.textContent = message;
  authAlert.classList.remove('hidden');
}

function hideAlert() {
  authAlert.className = 'alert hidden';
  authAlert.textContent = '';
}

function setLoading(isLoading) {
  if (isLoading) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const emailOrUsername = emailOrUsernameInput.value.trim();
    const password = passwordInput.value;

    if (!emailOrUsername || !password) {
      showAlert('Silakan lengkapi semua bidang.', 'danger');
      return;
    }

    try {
      setLoading(true);
      const res = await loginRequest(emailOrUsername, password);

      if (res && res.success) {
        setAuth(res.token, res.user);
        showAlert('Login berhasil! Mengalihkan...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);
      }
    } catch (error) {
      setLoading(false);
      showAlert(error.message || 'Terjadi kesalahan saat masuk.', 'danger');
    }
  });
}
