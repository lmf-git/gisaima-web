/**
 * User / auth store — backed by the custom JWT API
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiPost, apiGet, getToken, setToken, clearToken, connectWs, closeWs, setUnauthorizedHandler } from '$lib/api.js';

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

// Tear down the local session when the server rejects our token (401 on an
// authenticated request — e.g. the account no longer exists after a DB wipe).
let _invalidating = false;
function _invalidateSession() {
  if (_invalidating) return;       // guard against a burst of in-flight 401s
  _invalidating = true;
  clearToken();
  user.set(null);
  if (browser) localStorage.removeItem('gisaima-current-world');
  closeWs();                       // drop the socket so it can't keep streaming
  if (browser) goto('/login');     // hard-redirect away from the now-dead session
}

export function setup() {
  if (!browser) {
    loading.set(false);
    isAuthReady.set(true);
    return;
  }
  setUnauthorizedHandler(_invalidateSession);
  connectWs();
  _loadUser();
}

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

// Re-open the socket (it may have been intentionally closed by a prior
// invalidation) and allow future invalidations again.
function _resumeSession() {
  _invalidating = false;
  if (browser) connectWs();
}

export async function signIn(email, password) {
  try {
    const res = await apiPost('/auth/login', { email, password });
    setToken(res.token);
    user.set({ uid: res.uid, email: res.email, displayName: res.displayName, isGuest: false });
    _resumeSession();
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
    _resumeSession();
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
    _resumeSession();
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
