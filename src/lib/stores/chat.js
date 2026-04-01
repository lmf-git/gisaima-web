/**
 * Chat store — backed by HTTP API + WebSocket
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { apiGet, apiPost, wsChat } from '$lib/api.js';
import { user } from './user.js';
import { game } from './game.js';

const MAX_MESSAGES = 100;
export const MAX_CHAT_HISTORY = 500;

export const chatStore = writable({
  messages: [],
  loading: false,
  error: null,
  unreadCount: 0,
  currentWorldId: null,
  lastReadTime: Date.now(),
  subscriberCount: 0,
  readMessageIds: new Set()
});

export const messages = derived(
  chatStore,
  $chat => $chat.messages.slice().sort((a, b) => a.timestamp - b.timestamp)
);

export const unreadMessages = derived(
  [chatStore, user],
  ([$chat, $user]) => {
    const now = Date.now();
    const THRESHOLD = 5 * 60 * 1000;
    const uid = $user?.uid;
    return $chat.messages.filter(msg => {
      const isRecent = (now - msg.timestamp) < THRESHOLD;
      const isUnread = msg.timestamp > $chat.lastReadTime && !$chat.readMessageIds.has(msg.id);
      return isRecent && isUnread && msg.userId !== uid;
    }).length;
  }
);

let _unsub = null;

export function initializeChat(worldId) {
  if (!browser || !worldId) return () => {};

  chatStore.update(s => ({ ...s, subscriberCount: s.subscriberCount + 1 }));

  if (_unsub && get(chatStore).currentWorldId === worldId) {
    return () => _decrement();
  }

  if (_unsub) { _unsub(); _unsub = null; }

  chatStore.update(s => ({
    ...s, loading: true, error: null, currentWorldId: worldId,
    messages: s.currentWorldId !== worldId ? [] : s.messages
  }));

  // Fetch initial messages
  apiGet(`/worlds/${worldId}/chat`)
    .then(msgs => {
      chatStore.update(s => ({ ...s, messages: msgs, loading: false }));
    })
    .catch(e => chatStore.update(s => ({ ...s, loading: false, error: e.message })));

  // Subscribe to real-time updates
  _unsub = wsChat(worldId, (msg) => {
    if (msg.type === 'chat_message') {
      const message = msg.message;
      if (!message) return;
      chatStore.update(s => {
        const exists = s.messages.some(m => m.id === message.id);
        if (exists) return s;
        const newMessages = [...s.messages, message].slice(-MAX_MESSAGES);
        return { ...s, messages: newMessages };
      });
    }
  });

  return () => _decrement();
}

function _decrement() {
  chatStore.update(s => {
    const n = Math.max(0, s.subscriberCount - 1);
    if (n === 0 && _unsub) { _unsub(); _unsub = null; }
    return { ...s, subscriberCount: n };
  });
}

export async function sendMessage(text, messageType = 'user') {
  if (!browser || !text?.trim()) return false;
  const $user  = get(user);
  const $game  = get(game);
  const worldId = $game.worldKey;
  if (!$user || !worldId) return false;
  try {
    await apiPost(`/worlds/${worldId}/chat`, {
      text: text.trim(), type: messageType,
      location: $game.player?.lastLocation || null
    });
    return true;
  } catch (e) {
    console.error('Error sending message:', e);
    return false;
  }
}

export function markAllAsRead() {
  chatStore.update(s => ({
    ...s, unreadCount: 0, lastReadTime: Date.now(),
    readMessageIds: new Set(s.messages.map(m => m.id))
  }));
}

export function markMessagesAsRead(messageIds) {
  if (!messageIds?.length) return;
  chatStore.update(s => {
    const ids = new Set(s.readMessageIds);
    messageIds.forEach(id => ids.add(id));
    return { ...s, readMessageIds: ids };
  });
}

export function getMessageTime(timestamp) {
  if (!timestamp) return '';
  if (typeof timestamp === 'object') timestamp = Date.now();
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
