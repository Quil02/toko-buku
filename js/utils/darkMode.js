/**
 * Dark Mode Utility
 * Tombol toggle sudah ada secara statis di setiap HTML.
 * Script ini hanya: apply tema saat load + bind event ke tombol.
 */

const STORAGE_KEY = 'tokobuku_theme';

function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

function updateToggleBtn(theme) {
  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;
  const isDark = theme === 'dark';
  btn.textContent = isDark ? '☀️' : '🌙';
  btn.title       = isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap';
  btn.setAttribute('aria-label', btn.title);
}

function init() {
  const theme = getTheme();
  applyTheme(theme);
  updateToggleBtn(theme);

  const btn = document.getElementById('darkModeToggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    updateToggleBtn(next);
  });
}

// Apply tema ASAP untuk cegah flash, lalu bind setelah DOM siap
applyTheme(getTheme());

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
