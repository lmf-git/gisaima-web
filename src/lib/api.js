/**
 * API client — HTTP fetch + WebSocket for the Gisaima API
 *
 * Auth token is stored in localStorage as 'gisaima_token'.
 * All authenticated requests send it as 'Authorization: Bearer <token>'.
 *
 * WebSocket messages:
 *   Send: { type: 'subscribe_chunk' | 'subscribe_world' | 'subscribe_chat', worldId, chunkKey? }
 *   Receive: { type: 'chunk_update' | 'world_tick' | 'chat_message', worldId, ... }
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

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status });
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

/**
 * Connect (or reconnect) the WebSocket.
 * Call once at app startup.
 */
export function connectWs() {
  if (!browser) return;
  if (_ws && _ws.readyState <= 1) return; // already open or connecting

  const wsUrl = API_BASE.replace(/^http/, 'ws');
  _ws = new WebSocket(wsUrl);

  _ws.addEventListener('open', () => {
    console.log('[ws] connected');
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
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
    console.log('[ws] disconnected — reconnecting in 3s');
    if (_pingTimer) { clearInterval(_pingTimer); _pingTimer = null; }
    _ws = null;
    _reconnectTimer = setTimeout(connectWs, 3000);
  });

  _ws.addEventListener('error', (e) => console.error('[ws] error', e));
}

// Reconnect immediately when the app returns to foreground (phone unlocked / tab visible).
// On iOS, WebSocket connections die in the background and the close-event timer may
// not fire while the app is suspended, so we force reconnect on visibility change.
if (browser) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    // Close any zombie connection (readyState: CLOSING=2 or CLOSED=3)
    if (_ws && _ws.readyState > 1) { _ws = null; }
    connectWs();
  });
}


function _messageChannel(msg) {
  if (msg.type === 'chunk_update') return `chunk:${msg.worldId}:${msg.chunkKey}`;
  if (msg.type === 'world_tick')   return `world:${msg.worldId}`;
  if (msg.type === 'chat_message') return `chat:${msg.worldId}`;
  return null;
}

function _sendSubscription(channel) {
  if (!_ws || _ws.readyState !== 1) return;
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
