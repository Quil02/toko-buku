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
 * Get all cart items
 * @returns {Promise<Array>}
 */
export async function getCart() {
  try {
    const response = await fetch(`${API_URL}/api/cart`, {
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
    console.error('Get cart error:', error);
    return [];
  }
}

/**
 * Add book to cart
 * @param {Object} book 
 * @returns {Promise<boolean>}
 */
export async function addToCart(book) {
  if (!book || !book.id) {
    throw new Error('Data buku tidak valid untuk ditambahkan ke cart.');
  }

  try {
    const response = await fetch(`${API_URL}/api/cart`, {
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
        category: book.category || (book.categories?.[0]) || 'Umum',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return false;
    }

    return data.success;
  } catch (error) {
    console.error('Add to cart error:', error);
    throw error;
  }
}

/**
 * Remove item from cart
 * @param {string} bookId 
 */
export async function removeFromCart(bookId) {
  if (!bookId) return;

  try {
    const response = await fetch(`${API_URL}/api/cart/${bookId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Remove from cart failed');
    }
  } catch (error) {
    console.error('Remove from cart error:', error);
  }
}

/**
 * Clear all cart items
 */
export async function clearCart() {
  try {
    const response = await fetch(`${API_URL}/api/cart`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      console.error('Clear cart failed');
    }
  } catch (error) {
    console.error('Clear cart error:', error);
  }
}

/**
 * Check if book is in cart
 * @param {string} bookId 
 * @returns {Promise<boolean>}
 */
export async function isInCart(bookId) {
  if (!bookId) return false;

  try {
    const response = await fetch(`${API_URL}/api/cart/check/${bookId}`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.inCart || false;
  } catch (error) {
    console.error('Check cart error:', error);
    return false;
  }
}

/**
 * Get cart total price
 * @returns {Promise<number>}
 */
export async function getCartTotal() {
  try {
    const response = await fetch(`${API_URL}/api/cart/total`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.total || 0;
  } catch (error) {
    console.error('Get cart total error:', error);
    return 0;
  }
}

/**
 * Get cart item count
 * @returns {Promise<number>}
 */
export async function getCartCount() {
  try {
    const response = await fetch(`${API_URL}/api/cart/total`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Get cart count error:', error);
    return 0;
  }
}

export default {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  isInCart,
  getCartTotal,
  getCartCount,
};
