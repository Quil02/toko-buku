import { registerRequest } from '../api/authApi.js';
import { isAuthenticated, isGuest, setGuest } from '../utils/authStorage.js';

if (isAuthenticated()) {
  window.location.href = 'index.html';
}

const registerForm = document.getElementById('registerForm');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
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
    submitBtn.textContent = 'Mendaftarkan...';
  } else {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Daftar Akun';
  }
}

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!fullName || !email || !password || !confirmPassword) {
      showAlert('Silakan lengkapi semua bidang yang tersedia.', 'danger');
      return;
    }

    if (password.length < 6) {
      showAlert('Kata sandi harus memiliki panjang minimal 6 karakter.', 'danger');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Konfirmasi kata sandi tidak cocok dengan kata sandi!', 'danger');
      return;
    }

    try {
      setLoading(true);
      const res = await registerRequest({ fullName, email, password });

      if (res && res.success) {
        showAlert('Registrasi berhasil! Anda akan dialihkan ke halaman masuk...', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      }
    } catch (error) {
      setLoading(false);
      showAlert(error.message || 'Terjadi kesalahan saat registrasi.', 'danger');
    }
  });
}

const guestBtn = document.getElementById('guestBtn');

if (guestBtn) {
  guestBtn.addEventListener('click', () => {
    setGuest();
    window.location.href = 'index.html';
  });
}
