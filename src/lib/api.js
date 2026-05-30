/**
 * API client — HTTP fetch + WebSocket for the Gisaima API
 *
 * Auth token is stored in localStorage as 'gisaima_token'.
 * All authenticated requests send it as 'Authorization: Bearer <token>'.
 *
 * WebSocket messages:
 *   Send: { type: 'subscribe_chunk' | 'subscribe_world' | 'subscribe_chat', worldId, chunkKey? }
 *   Receive: { type: 'chunk_update' | 'world_tick' | 'chat_message' | 'achievement_unlocked', worldId, ... }
 */

import { browser, dev } from '$app/environment';

export const API_BASE = import.meta.env.VITE_API_URL || (dev ? 'http://localhost:3001' : 'https://gisaima-app-80a85ed95aa0.herokuapp.com');

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken() {
  if (!browser) return null;
  return localStorage.getItem('gisaima_token');
}

export function setToken(token) {
  if (!browser) return;
  localStorage.setItem('gisaima_token', token);
  // The socket may already be open from app startup (e.g. the user just logged
  // in mid-session). Re-authenticate it now so user-targeted server pushes
  // (achievement_unlocked, etc.) are delivered to this socket.
  if (_ws && _ws.readyState === 1) _ws.send(JSON.stringify({ type: 'authenticate', token }));
}

export function clearToken() {
  if (!browser) return;
  localStorage.removeItem('gisaima_token');
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function authHeaders() {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

// Invoked when an authenticated request comes back 401 — the token is no longer
// valid (expired, or the account was removed). Registered by the user store to
// tear down the session. Kept as a callback to avoid an import cycle.
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) { _onUnauthorized = fn; }

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const hadToken = !!getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // We sent a token but the server rejected it → the session is dead. Sign out
    // so the UI stops pretending a ghost account is logged in. Auth endpoints
    // handle their own 401s (e.g. bad login credentials), so exclude them.
    if (res.status === 401 && hadToken && !path.startsWith('/auth/')) _onUnauthorized?.();
    throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
  }
  return data;
}

export const apiGet  = (path)         => apiFetch(path);
export const apiPost = (path, body)   => apiFetch(path, { method: 'POST', body });

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

let _ws = null;
let _wsListeners = new Map();   // channel → Set<callback>
let _reconnectTimer = null;
let _pingTimer = null;          // client-side keepalive
let _wsClosedIntentionally = false; // set by closeWs() to suppress auto-reconnect

/**
 * Connect (or reconnect) the WebSocket.
 * Call once at app startup.
 */
export function connectWs() {
  if (!browser) return;
  _wsClosedIntentionally = false;
  if (_ws && _ws.readyState <= 1) return; // already open or connecting

  const wsUrl = API_BASE.replace(/^http/, 'ws');
  _ws = new WebSocket(wsUrl);

  _ws.addEventListener('open', () => {
    console.log('[ws] connected');
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    // Authenticate so the server can apply fog-of-war filtering
    const token = getToken();
    if (token) _ws.send(JSON.stringify({ type: 'authenticate', token }));
    // Re-subscribe all channels
    for (const channel of _wsListeners.keys()) {
      _sendSubscription(channel);
    }
    // Client-side keepalive: send a ping every 25 s so Heroku doesn't close
    // the connection after 55 s of inactivity (H15 error).
    if (_pingTimer) clearInterval(_pingTimer);
    _pingTimer = setInterval(() => {
      if (_ws && _ws.readyState === 1) _ws.send(JSON.stringify({ type: 'ping' }));
    }, 25_000);
  });

  _ws.addEventListener('message', (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    // Dispatch to channel listeners
    const channel = _messageChannel(msg);
    if (channel && _wsListeners.has(channel)) {
      for (const cb of _wsListeners.get(channel)) cb(msg);
    }
  });

  _ws.addEventListener('close', () => {
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
    _ws = null;
    if (_wsClosedIntentionally) {
      console.log('[ws] disconnected (intentional)');
      return;
    }
    console.log('[ws] disconnected — reconnecting in 3s');
    _reconnectTimer = setTimeout(connectWs, 3000);
  });

  _ws.addEventListener('error', (e) => console.error('[ws] error', e));
}

/** Close the socket and suppress auto-reconnect (e.g. on sign-out / dead session). */
export function closeWs() {
  if (!browser) return;
  _wsClosedIntentionally = true;
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
  if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
  if (_ws) { try { _ws.close(); } catch { /* ignore */ } _ws = null; }
}

// Reconnect immediately when the app returns to foreground (phone unlocked / tab visible).
// On iOS, WebSocket connections die in the background and the close-event timer may
// not fire while the app is suspended, so we force reconnect on visibility change.
if (browser) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (_wsClosedIntentionally) return; // stay disconnected after an intentional close
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    // Close any zombie connection (readyState: CLOSING=2 or CLOSED=3)
    if (_ws && _ws.readyState > 1) { _ws = null; }
    connectWs();
  });
}


// Channel key used locally for server-pushed user-specific events (no subscription needed —
// the server targets these to the authenticated socket directly).
const USER_CHANNEL = 'user';

function _messageChannel(msg) {
  if (msg.type === 'chunk_update')       return `chunk:${msg.worldId}:${msg.chunkKey}`;
  if (msg.type === 'world_tick')         return `world:${msg.worldId}`;
  if (msg.type === 'chat_message')       return `chat:${msg.worldId}`;
  if (msg.type === 'achievement_unlocked') return USER_CHANNEL;
  return null;
}

function _sendSubscription(channel) {
  if (!_ws || _ws.readyState !== 1) return;
  // User channel is server-push only — no subscription message needed.
  if (channel === USER_CHANNEL) return;
  const [type, worldId, chunkKey] = channel.split(':');
  const msg = { worldId };
  if (type === 'chunk') { msg.type = 'subscribe_chunk'; msg.chunkKey = chunkKey; }
  if (type === 'world') { msg.type = 'subscribe_world'; }
  if (type === 'chat')  { msg.type = 'subscribe_chat'; }
  _ws.send(JSON.stringify(msg));
}

/**
 * Subscribe to a WebSocket channel.
 * Returns an unsubscribe function.
 */
export function wsSubscribe(channel, callback) {
  if (!_wsListeners.has(channel)) _wsListeners.set(channel, new Set());
  _wsListeners.get(channel).add(callback);
  // Subscribe on the server
  _sendSubscription(channel);
  return () => {
    const set = _wsListeners.get(channel);
    if (set) { set.delete(callback); if (!set.size) _wsListeners.delete(channel); }
  };
}

export const wsChunk = (worldId, chunkKey, cb) => wsSubscribe(`chunk:${worldId}:${chunkKey}`, cb);
export const wsWorld = (worldId, cb)             => wsSubscribe(`world:${worldId}`, cb);
export const wsChat  = (worldId, cb)             => wsSubscribe(`chat:${worldId}`,  cb);
// Server-pushed user events (achievement_unlocked, etc.) — no server-side subscription needed.
export const wsUser  = (cb)                      => wsSubscribe(USER_CHANNEL, cb);
