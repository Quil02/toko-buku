/**
 * Mobile Navigation — Hamburger Menu
 * Mengisi #mobileDrawer dengan link yang sama seperti navbar desktop,
 * lalu toggle open/close saat hamburger diklik.
 */
export function initMobileNav() {
  const hamburger = document.getElementById('navHamburger');
  const drawer    = document.getElementById('mobileDrawer');
  if (!hamburger || !drawer) return;

  // Salin konten dari navbar desktop ke drawer mobile
  function syncDrawer() {
    const desktopNav  = document.querySelector('.navbar-nav');
    const desktopUser = document.querySelector('.navbar-user');

    let html = '';

    if (desktopNav) {
      html += desktopNav.innerHTML;
    }

    // Auth row
    if (desktopUser) {
      html += `<div class="mobile-user-info">${desktopUser.innerHTML}</div>`;
    }

    drawer.innerHTML = html;
  }

  syncDrawer();

  // Toggle drawer
  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Tutup saat klik di luar drawer
  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && !hamburger.contains(e.target)) {
      drawer.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });

  // Tutup saat klik link di dalam drawer
  drawer.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      drawer.classList.remove('open');
      hamburger.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Re-sync drawer setelah JS halaman mengisi navbar (auth state)
  // Pakai MutationObserver agar sinkron meski navbar diisi async
  const navUser = document.querySelector('.navbar-user');
  if (navUser) {
    const observer = new MutationObserver(() => {
      if (!drawer.classList.contains('open')) syncDrawer();
    });
    observer.observe(navUser, { childList: true, subtree: true });
  }
}
