import { CONFIG } from '../config.js';

const API_URL = CONFIG.API_BASE_URL;

/**
 * Get authorization header with JWT token
 */
function getAuthHeader() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Get all wishlist items
 * @returns {Promise<Array>}
 */
export async function getWishlist() {
  try {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Get wishlist error:', error);
    return [];
  }
}

/**
 * Add book to wishlist
 * @param {Object} book 
 * @returns {Promise<boolean>}
 */
export async function addToWishlist(book) {
  if (!book || !book.id) {
    throw new Error('Data buku tidak valid untuk ditambahkan ke wishlist.');
  }

  try {
    const response = await fetch(`${API_URL}/api/wishlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        id: book.id,
        title: book.title || 'Tanpa Judul',
        authors: book.authors || ['Anonim'],
        price: book.price || 0,
        thumbnail: book.thumbnail || 'https://via.placeholder.com/150x220?text=No+Cover',
        category: book.category || 'Umum',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return false;
    }

    return data.success;
  } catch (error) {
    console.error('Add to wishlist error:', error);
    throw error;
  }
}

/**
 * Remove book from wishlist
 * @param {string} bookId 
 * @returns {Promise<Array>}
 */
export async function removeFromWishlist(bookId) {
  if (!bookId) return [];

  try {
    const response = await fetch(`${API_URL}/api/wishlist/${bookId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Remove from wishlist failed');
    }
    
    // Return updated wishlist
    return await getWishlist();
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return [];
  }
}

/**
 * Check if book is in wishlist
 * @param {string} bookId 
 * @returns {Promise<boolean>}
 */
export async function isInWishlist(bookId) {
  if (!bookId) return false;

  try {
    const response = await fetch(`${API_URL}/api/wishlist/check/${bookId}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.inWishlist || false;
  } catch (error) {
    console.error('Check wishlist error:', error);
    return false;
  }
}

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist
};
