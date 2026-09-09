import { CONFIG } from '../config.js';

const ACTIVE_USER_KEY = 'tokobuku_active_user';
const GUEST_KEY = 'tokobuku_guest';

export function setAuth(token, user) {
  try {
    // Hapus flag guest saat user login dengan akun
    localStorage.removeItem(GUEST_KEY);
    if (token) {
      localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
      // Simpan juga sebagai active user untuk diakses di checkout
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.error('Failed to save auth to localStorage:', error);
  }
}

export function getToken() {
  try {
    return localStorage.getItem(CONFIG.TOKEN_KEY) || null;
  } catch (error) {
    console.error('Failed to get token from localStorage:', error);
    return null;
  }
}

export function getUser() {
  try {
    const userRaw = localStorage.getItem(ACTIVE_USER_KEY);
    return userRaw ? JSON.parse(userRaw) : null;
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function clearAuth() {
  try {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(GUEST_KEY);
  } catch (error) {
    console.error('Failed to clear auth from localStorage:', error);
  }
}


export function setGuest() {
  try {
    localStorage.setItem(GUEST_KEY, 'true');
  } catch (error) {
    console.error('Failed to set guest mode:', error);
  }
}

export function isGuest() {
  try {
    return localStorage.getItem(GUEST_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

export default {
  setAuth,
  getToken,
  getUser,
  isAuthenticated,
  clearAuth,
  setGuest,
  isGuest,
};
