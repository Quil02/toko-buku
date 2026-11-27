import { CONFIG } from '../config.js';
import { getToken } from '../utils/authStorage.js';

const API_BASE = CONFIG.API_BASE_URL;

/**
 * Get admin statistics
 */
export async function getAdminStats() {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengambil statistik');
    }
    return response.json();
}

/**
 * Get all transactions
 */
export async function getAllTransactions() {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/admin/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengambil data transaksi');
    }
    return response.json();
}

/**
 * Get all users
 */
export async function getAllUsers() {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengambil data pengguna');
    }
    return response.json();
}

/**
 * Ban (nonaktifkan) akun user
 */
export async function banUser(userId) {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal menonaktifkan akun');
    }
    return response.json();
}

/**
 * Unban (aktifkan kembali) akun user
 */
export async function unbanUser(userId) {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}/unban`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Gagal mengaktifkan akun');
    }
    return response.json();
}
