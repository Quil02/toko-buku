import { CONFIG } from '../config.js';

export function setAuth(token, user) {
  try {
    if (token) {
      localStorage.setItem(CONFIG.TOKEN_KEY, token);
    }
    if (user) {
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
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
    const userRaw = localStorage.getItem(CONFIG.USER_KEY);
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
  } catch (error) {
    console.error('Failed to clear auth from localStorage:', error);
  }
}

export default {
  setAuth,
  getToken,
  getUser,
  isAuthenticated,
  clearAuth
};
