/**
 * User / auth store — backed by the custom JWT API
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { apiPost, apiGet, getToken, setToken, clearToken, connectWs } from '$lib/api.js';

export const user    = writable(null);   // { uid, email, displayName, isGuest } | null
export const loading = writable(true);
export const isAuthReady = writable(false);

async function _loadUser() {
  const token = getToken();
  if (!token) {
    loading.set(false);
    isAuthReady.set(true);
    return;
  }
  try {
    const me = await apiGet('/auth/me');
    user.set({ uid: me.uid, email: me.email, displayName: me.displayName, isGuest: me.isGuest });
  } catch {
    clearToken();
    user.set(null);
  } finally {
    loading.set(false);
    isAuthReady.set(true);
  }
}

export function setup() {
  if (!browser) {
    loading.set(false);
    isAuthReady.set(true);
    return;
  }
  connectWs();
  _loadUser();
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

export async function signIn(email, password) {
  try {
    const res = await apiPost('/auth/login', { email, password });
    setToken(res.token);
    user.set({ uid: res.uid, email: res.email, displayName: res.displayName, isGuest: false });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function signUp(email, password) {
  try {
    const res = await apiPost('/auth/register', { email, password });
    setToken(res.token);
    user.set({ uid: res.uid, email: res.email, displayName: res.displayName, isGuest: false });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function signInAnonymously() {
  try {
    const res = await apiPost('/auth/guest', {});
    setToken(res.token);
    user.set({ uid: res.uid, email: null, displayName: res.displayName, isGuest: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function signOut() {
  clearToken();
  user.set(null);
  if (browser) localStorage.removeItem('gisaima-current-world');
  return { success: true };
}

// Stubs kept for API compatibility with existing Svelte components
export const handleEmailLink    = async () => ({ success: false, error: 'Not supported' });
export const signInWithEmailLink = async () => ({ success: false, error: 'Not supported' });
export const sendSignInLink      = async () => ({ success: false, error: 'Not supported' });
