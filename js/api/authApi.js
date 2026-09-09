import { CONFIG } from '../config.js';

const MOCK_USERS_KEY = CONFIG.MOCK_USERS_KEY || 'mock_registered_users';

function getStoredUsers() {
  try {
    const data = localStorage.getItem(MOCK_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to read users from localStorage:', err);
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to localStorage:', err);
  }
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function registerRequest(userData) {
  await delay();

  const { fullName, email, password } = userData;

  if (!fullName || !email || !password) {
    throw new Error('Semua data wajib diisi!');
  }

  const users = getStoredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const normalizedFullName = fullName.trim().toLowerCase();

  const existingByEmail = users.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );
  if (existingByEmail) {
    throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
  }

  const existingByName = users.find(
    (u) => u.fullName.toLowerCase() === normalizedFullName
  );
  if (existingByName) {
    throw new Error('Nama pengguna sudah digunakan. Silakan gunakan nama lain.');
  }

  const newUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    fullName: fullName.trim(),
    email: normalizedEmail,
    password: password,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return {
    success: true,
    message: 'Registrasi berhasil!'
  };
}

export async function loginRequest(emailOrUsername, password) {
  await delay();

  if (!emailOrUsername || !password) {
    throw new Error('Email/Username dan kata sandi wajib diisi!');
  }

  const users = getStoredUsers();
  const target = emailOrUsername.trim().toLowerCase();

  const isEmail = target.includes('@');
  const user = users.find((u) => {
    const matchEmail = u.email.toLowerCase() === target;
    const matchName = !isEmail && u.fullName.toLowerCase() === target;
    return (matchEmail || matchName) && u.password === password;
  });

  if (!user) {
    throw new Error('Email/Username atau kata sandi salah!');
  }

  return {
    success: true,
    token: `mock-token-${Date.now()}`,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    }
  };
}

export default {
  registerRequest,
  loginRequest
};
