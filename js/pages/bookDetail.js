import { fetchBookById } from '../api/bookApi.js';
import { getReviewsByBookId, submitReview } from '../api/reviewApi.js';
import { addToWishlist, isInWishlist } from '../api/wishlistApi.js';
import { getUser, isAuthenticated, clearAuth } from '../utils/authStorage.js';

const breadcrumbTitle = document.getElementById('breadcrumbTitle');
const bookDetailWrapper = document.getElementById('bookDetailWrapper');
const reviewsSection = document.getElementById('reviewsSection');
const reviewsList = document.getElementById('reviewsList');
const reviewForm = document.getElementById('reviewForm');
const starRatingInput = document.getElementById('starRatingInput');
const ratingValue = document.getElementById('ratingValue');
const reviewUserName = document.getElementById('reviewUserName');
const reviewComment = document.getElementById('reviewComment');
const authNavContainer = document.getElementById('authNavContainer');

/**
 * Format angka ke mata uang Rupiah
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format tanggal ulasan
 */
function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return 'Baru saja';
  }
}

/**
 * Inisialisasi status navbar
 */
function initNavbarAuth() {
  if (!authNavContainer) return;

  if (isAuthenticated()) {
    const user = getUser();
    const displayName = user?.fullName || user?.email || 'Akun Saya';
    authNavContainer.innerHTML = `
      <span style="font-size: 0.9rem; font-weight: 600; color: #4b5563;">Halo, ${displayName}</span>
      <button class="btn btn-outline" id="btnLogout" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;">Keluar</button>
    `;

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      clearAuth();
      window.location.reload();
    });

    if (reviewUserName && user?.fullName) {
      reviewUserName.value = user.fullName;
    }
  }
}

/**
 * Render ulasan buku
 */
function renderReviews(bookId) {
  const reviews = getReviewsByBookId(bookId);

  if (reviews.length === 0) {
    reviewsList.innerHTML = '<p style="color: #6b7280; font-size: 0.95rem;">Belum ada ulasan untuk buku ini. Jadilah yang pertama memberikan ulasan!</p>';
    return;
  }

  reviewsList.innerHTML = reviews.map(rev => `
    <div class="review-item">
      <div class="review-item-header">
        <span class="review-item-user">${rev.userName}</span>
        <span class="review-item-date">${formatDate(rev.createdAt)}</span>
      </div>
      <div class="review-item-rating">
        ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
      </div>
      <p class="review-item-comment">${rev.comment}</p>
    </div>
  `).join('');
}

/**
 * Interaksi Bintang Rating
 */
function initRatingStars() {
  const stars = starRatingInput?.querySelectorAll('.star');
  if (!stars) return;

  function highlightStars(val) {
    stars.forEach(star => {
      const starVal = parseInt(star.getAttribute('data-val'), 10);
      if (starVal <= val) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
  }

  stars.forEach(star => {
    star.addEventListener('click', () => {
      const selected = parseInt(star.getAttribute('data-val'), 10);
      if (ratingValue) {
        ratingValue.value = selected;
      }
      highlightStars(selected);
    });
  });
}

/**
 * Muat detail buku dari API
 */
async function loadBookDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookId = urlParams.get('id');

  if (!bookId) {
    breadcrumbTitle.textContent = 'Buku Tidak Ditemukan';
    bookDetailWrapper.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">ID Buku Tidak Valid</h3>
        <p class="catalog-state-desc">Silakan kembali ke halaman <a href="index.html" style="color: #2563eb;">Katalog</a> dan pilih buku yang diinginkan.</p>
      </div>
    `;
    return;
  }

  try {
    const book = await fetchBookById(bookId);

    breadcrumbTitle.textContent = book.title;
    document.title = `${book.title} - TokoBuku`;

    const alreadyInWishlist = isInWishlist(book.id);

    bookDetailWrapper.innerHTML = `
      <section class="book-detail-main">
        <div class="book-detail-cover-area">
          <div class="book-detail-cover-wrap">
            <img src="${book.thumbnail}" alt="${book.title}" class="book-detail-cover" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80'">
          </div>
        </div>

        <div class="book-detail-info">
          <span class="book-detail-category-badge">${book.categories.join(', ')}</span>
          <h1 class="book-detail-title">${book.title}</h1>
          <p class="book-detail-authors">Oleh: <strong>${book.authors.join(', ')}</strong></p>

          <div class="book-detail-rating-summary">
            <span>★</span> <strong>${book.rating}</strong>
            <span style="color: #6b7280; font-size: 0.9rem;">(${book.ratingsCount} ulasan pembaca)</span>
          </div>

          <div class="book-detail-price">
            ${formatRupiah(book.price)}
          </div>

          <div class="book-detail-actions">
            <button class="btn btn-primary" id="btnBuyNow">🛒 Beli Sekarang</button>
            <button class="btn btn-outline" id="btnWishlist">
              ${alreadyInWishlist ? '❤️ Sudah di Wishlist' : '🤍 Tambah ke Wishlist'}
            </button>
          </div>

          <div class="book-metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Penerbit</span>
              <span class="metadata-value">${book.publisher}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Tahun Terbit</span>
              <span class="metadata-value">${book.publishedDate}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Halaman</span>
              <span class="metadata-value">${book.pageCount ? book.pageCount + ' Hlm' : 'N/A'}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Stok Tersedia</span>
              <span class="metadata-value">${book.stock} unit</span>
            </div>
          </div>

          <div class="book-synopsis">
            <h3 class="book-synopsis-title">Sinopsis Buku</h3>
            <div class="book-synopsis-text">${book.description}</div>
          </div>
        </div>
      </section>
    `;

    // Tampilkan bagian ulasan & render
    if (reviewsSection) {
      reviewsSection.style.display = 'block';
      renderReviews(book.id);
    }

    // Tombol aksi interaktif
    document.getElementById('btnBuyNow')?.addEventListener('click', () => {
      alert(`Buku "${book.title}" telah ditambahkan ke keranjang belanja.`);
    });

    const btnWishlist = document.getElementById('btnWishlist');
    btnWishlist?.addEventListener('click', () => {
      const added = addToWishlist(book);
      if (added) {
        btnWishlist.textContent = '❤️ Sudah di Wishlist';
        alert(`Buku "${book.title}" berhasil disimpan ke daftar wishlist.`);
      } else {
        alert(`Buku "${book.title}" sudah ada di daftar wishlist Anda.`);
      }
    });

    // Form submit review
    reviewForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const rating = parseInt(ratingValue ? ratingValue.value : '5', 10);
        const comment = reviewComment.value;
        const userName = reviewUserName?.value || (getUser()?.fullName || 'Pembaca');

        submitReview(book.id, { rating, comment, userName });
        reviewComment.value = '';
        
        // Reset stars to 5
        if (ratingValue) ratingValue.value = '5';
        const stars = starRatingInput?.querySelectorAll('.star');
        stars?.forEach(s => s.classList.add('active'));

        renderReviews(book.id);
        alert('Terima kasih! Ulasan Anda berhasil ditambahkan.');
      } catch (err) {
        alert(err.message || 'Gagal menyimpan ulasan.');
      }
    });

  } catch (error) {
    breadcrumbTitle.textContent = 'Kesalahan';
    bookDetailWrapper.innerHTML = `
      <div class="catalog-state">
        <div class="catalog-state-icon">⚠️</div>
        <h3 class="catalog-state-title">Gagal Memuat Buku</h3>
        <p class="catalog-state-desc">Tidak dapat mengambil data buku dari Open Library API.</p>
      </div>
    `;
  }
}

// Initial Setup
initNavbarAuth();
initRatingStars();
loadBookDetail();
