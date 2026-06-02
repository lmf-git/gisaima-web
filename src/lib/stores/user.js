/**
 * User / auth store — backed by the custom JWT API
 */

import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { apiPost, apiGet, getToken, setToken, clearToken, connectWs, closeWs, setUnauthorizedHandler } from '$lib/api.js';

export const user    = writable(null);   // { uid, email, displayName, isGuest } | null
export const loading = writable(true);
export const isAuthReady = writable(false);
// True when the server says this returning guest should be nudged to convert to
// a real account (at most once per calendar day — tracked server-side).
export const guestConversionDue = writable(false);

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
    if (me.isGuest && me.promptConversion) guestConversionDue.set(true);
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
  _stopConversionWatch();
  clearToken();
  user.set(null);
  if (browser) localStorage.removeItem('gisaima-current-world');
  closeWs();                       // drop the socket so it can't keep streaming
  if (browser) goto('/login');     // hard-redirect away from the now-dead session
}

let _storageBound = false;
export function setup() {
  if (!browser) {
    loading.set(false);
    isAuthReady.set(true);
    return;
  }
  setUnauthorizedHandler(_invalidateSession);

  // Cross-tab auth sync. localStorage is shared across same-origin tabs, so when
  // a magic-link tab signs in / converts a guest (setToken writes the key), the
  // OTHER tabs receive this event. The original guest tab thus adopts the new
  // JWT and refreshes to the converted account on its own — no manual reload,
  // and the GuestWarning auto-closes once $user is no longer a guest.
  if (!_storageBound) {
    _storageBound = true;
    window.addEventListener('storage', (e) => {
      if (e.key !== 'gisaima_token') return;
      if (e.newValue) {
        _resumeSession();   // re-auth the socket with the new token
        _loadUser();        // pull the (possibly converted) user from /auth/me
      } else {
        user.set(null);     // signed out in another tab
        guestConversionDue.set(false);
        closeWs();
      }
    });
  }

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

export async function signUp(email, password, convertGuest = false) {
  // Passwordless sign-up / conversion: email a one-time link instead of setting
  // a password. The account (or guest upgrade) is finalised when the link is
  // opened (`completeEmailLogin`).
  if (!password) return sendSignInLink(email, { convert: convertGuest });
  try {
    const body = { email, password };
    // Upgrade the *current* guest in place (preserving uid → worlds, lives,
    // groups) rather than minting a fresh account that orphans their progress.
    if (convertGuest) body.guestToken = getToken();
    const res = await apiPost('/auth/register', body);
    setToken(res.token);
    user.set({ uid: res.uid, email: res.email, displayName: res.displayName, isGuest: false });
    guestConversionDue.set(false);
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
  _stopConversionWatch();
  clearToken();
  user.set(null);
  if (browser) localStorage.removeItem('gisaima-current-world');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Passwordless email sign-in (magic link)
// ---------------------------------------------------------------------------

// Fallback for cross-device conversion: the storage-event sync only fires when
// the link is opened in the SAME browser. When a guest sends themselves a
// conversion link, poll /auth/me until the server reports the account is no
// longer a guest, then reflect it here (the original guest token stays valid —
// same uid — so it keeps working without the freshly-minted JWT).
let _conversionWatch = null;
function _stopConversionWatch() {
  if (_conversionWatch) { clearTimeout(_conversionWatch); _conversionWatch = null; }
}
function _watchGuestConversion({ intervalMs = 5000, timeoutMs = 16 * 60 * 1000 } = {}) {
  if (!browser) return;
  _stopConversionWatch();
  const start = Date.now();
  const poll = async () => {
    _conversionWatch = null;
    if (Date.now() - start > timeoutMs) return;     // link has expired — give up
    const u = get(user);
    if (!u || !u.isGuest) return;                   // session ended or already converted
    try {
      const me = await apiGet('/auth/me');
      if (me && !me.isGuest) {
        user.set({ uid: me.uid, email: me.email, displayName: me.displayName, isGuest: false });
        guestConversionDue.set(false);
        return;                                     // converted — stop polling
      }
    } catch { /* transient — keep polling */ }
    _conversionWatch = setTimeout(poll, intervalMs);
  };
  _conversionWatch = setTimeout(poll, intervalMs);
}

// Ask the server to email a one-time sign-in link. Pass { convert: true } to
// upgrade the current guest in place (the guest token is forwarded so the
// resulting account keeps the same uid → worlds/lives/groups).
export async function sendSignInLink(email, { convert = false } = {}) {
  try {
    const body = { email };
    if (convert) body.guestToken = getToken();
    await apiPost('/auth/email/request', body);
    if (convert) _watchGuestConversion();   // catch a link opened on another device
    return { success: true, emailLink: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Complete sign-in from the link's `?token=` (used by /login/verify).
export async function completeEmailLogin(token) {
  try {
    const res = await apiPost('/auth/email/verify', { token });
    setToken(res.token);
    user.set({ uid: res.uid, email: res.email, displayName: res.displayName, isGuest: false });
    guestConversionDue.set(false);
    _resumeSession();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Back-compat aliases for the old Firebase-style names still referenced around
// the app — both now complete a magic-link sign-in.
export const handleEmailLink     = completeEmailLogin;
export const signInWithEmailLink = completeEmailLogin;
