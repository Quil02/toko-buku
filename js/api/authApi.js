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
 * Register new user
 * @param {Object} userData - { fullName, email, password }
 * @returns {Promise<Object>}
 */
export async function registerRequest(userData) {
  const { fullName, email, password } = userData;

  if (!fullName || !email || !password) {
    throw new Error('Semua data wajib diisi!');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Registrasi gagal!');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Login user
 * @param {string} emailOrUsername 
 * @param {string} password 
 * @returns {Promise<Object>}
 */
export async function loginRequest(emailOrUsername, password) {
  if (!emailOrUsername || !password) {
    throw new Error('Email/Username dan kata sandi wajib diisi!');
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emailOrUsername, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login gagal!');
    }

    // Store token and user data
    if (data.token) {
      localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
    }
    if (data.user) {
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export default {
  registerRequest,
  loginRequest
};
