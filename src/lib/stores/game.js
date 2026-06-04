/**
 * Game store — backed by the custom HTTP API + WebSocket
 */

import { writable, readable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { apiGet, apiPost, wsWorld, wsUser } from '$lib/api.js';
import { ACHIEVEMENTS } from 'gisaima-shared/definitions/ACHIEVEMENTS.js';
import { user, isAuthReady as userAuthReady } from './user.js';
import { dayCycle } from '$lib/era.js';
// Intentionally not importing from map.js to avoid circular dependency.
// (map.js imports `game` from this file; game.js must not import from map.js)
const _TARGET_X_SUFFIX = '-targetX';
const _TARGET_Y_SUFFIX = '-targetY';
function _clearSavedTargetPosition(worldId) {
  if (!browser || !worldId) return;
  try {
    localStorage.removeItem(`${worldId}${_TARGET_X_SUFFIX}`);
    localStorage.removeItem(`${worldId}${_TARGET_Y_SUFFIX}`);
  } catch { /* ignore */ }
}

const CURRENT_WORLD_KEY = 'gisaima-current-world';
export function clearCurrentWorld() {
  if (!browser) return;
  try { localStorage.removeItem(CURRENT_WORLD_KEY); } catch { /* ignore */ }
  game.update(s => ({ ...s, worldKey: null }));
}
const CHUNK_SIZE = 20;

export { userAuthReady as isAuthReady };

export const recentUnlock = writable(null);

export const game = writable({
  worldKey: null,
  joinedWorlds: null,  // null = not yet fetched; [] = fetched but empty
  worlds: {},
  player: null,
  playerLoaded: false,  // false until player world data has been fetched at least once
  loading: true,
  worldLoading: false,
  error: null,
  initialized: false
});

export const currentWorldInfo = derived(game, $g => $g.worldKey ? $g.worlds[$g.worldKey] || null : null);
export const currentWorldSeed  = derived(currentWorldInfo, $w => $w?.seed || null);
export const currentWorldCenter = derived([game, currentWorldInfo], ([$g, $w]) => {
  if (!$w) return { x: 0, y: 0 };
  if ($w.center && typeof $w.center.x === 'number') return { x: $w.center.x, y: $w.center.y };
  return { x: 0, y: 0 };
});

export const currentPlayer = derived([user, game], ([$u, $g]) => {
  if (!$u || !$g.worldKey || !$g.player) return null;
  // `id` stays the uid (groups/structures are owned per-user). `lifeId` is the
  // character the map currently follows — entities are keyed by lifeId.
  return { id: $u.uid, lifeId: $g.player.controlledLifeId ?? null, ...$g.player };
});

export const worldInfo = writable({
  loading: false, name: null, description: null, seed: null,
  lastTick: null, speed: 1, size: null, center: { x: 0, y: 0 }, spawns: {}
});

// The sky's current state, derived from the world's tick count. Drives the
// map's ambient tint and whether structures light their torches.
export const dayNight = derived(worldInfo, $w => dayCycle($w?.tickCount));

export const nextWorldTick = derived(worldInfo, $w => {
  if (!$w?.lastTick) return null;
  return $w.lastTick + Math.round(60000 / ($w.speed || 1));
});

// A clock that emits the current time once a second while subscribed. Used to
// drive live countdowns — without it, anything derived purely from worldInfo
// only recomputes when a tick message arrives, so a "time until next tick"
// readout would freeze at its initial value (e.g. a static "60s") instead of
// counting down. The interval only runs while there is at least one subscriber.
const now = readable(Date.now(), set => {
  const id = setInterval(() => set(Date.now()), 1000);
  return () => clearInterval(id);
});

export const timeUntilNextTick = derived([nextWorldTick, now], ([$next, $now]) => {
  if (!$next) return 'Unknown';
  const rem = $next - $now;
  if (rem <= 0) return 'Pending';
  if (rem <= 60000) return `${Math.max(0, Math.ceil(rem / 1000))}s`;
  return `${Math.floor(rem / 60000)}m`;
});

export function timeUntilTick(numTicks = 1) {
  const $w = get(worldInfo);
  if (!$w?.lastTick) return 'Unknown';
  const interval = Math.round(60000 / ($w.speed || 1));
  const rem = $w.lastTick + interval * numTicks - Date.now();
  if (rem <= 0) return 'Pending';
  if (rem <= 60000) return `${Math.ceil(rem / 1000)}s`;
  const m = Math.floor(rem / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

let _worldInfoUnsub = null;
let _worldInfoId    = null;

// Subscribe once to server-pushed user events (achievement_unlocked, etc.).
// The server targets these directly to the authenticated socket — no explicit
// server-side subscription message is sent.
if (browser) {
  wsUser((msg) => {
    if (msg.type === 'achievement_unlocked') {
      const { achievementId, worldId } = msg;
      const alreadyUnlocked = get(game).player?.achievements?.[achievementId] === true;
      // Update local player state so the achievement panel reflects it immediately.
      if (!alreadyUnlocked && worldId) {
        game.update(s => ({
          ...s,
          player: s.player
            ? { ...s.player, achievements: { ...(s.player.achievements || {}), [achievementId]: true } }
            : s.player,
        }));
      }
      if (!alreadyUnlocked) {
        const info = ACHIEVEMENTS[achievementId] || { title: achievementId, description: 'Achievement unlocked!' };
        recentUnlock.set({ id: achievementId, ...info, date: Date.now() });
        setTimeout(() => {
          recentUnlock.update(c => c?.id === achievementId ? null : c);
        }, 8000);
      }
    }
  });
}

export function subscribeToWorldInfo(worldId) {
  if (_worldInfoUnsub) { _worldInfoUnsub(); _worldInfoUnsub = null; }
  if (!worldId) return;
  _worldInfoId = worldId;
  worldInfo.update(s => ({ ...s, loading: true }));
  _worldInfoUnsub = wsWorld(worldId, (msg) => {
    if (msg.type === 'world_tick') {
      worldInfo.set({ ...msg.info, loading: false });
      game.update(s => ({ ...s, worlds: { ...s.worlds, [worldId]: msg.info } }));
    }
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

export async function loadJoinedWorlds(userId) {
  if (!userId) return [];
  try {
    const joined = await apiGet(`/players/${userId}/worlds`).catch(() => null);
    const worldIds = Array.isArray(joined) ? joined : (joined ? Object.keys(joined) : []);
    game.update(s => ({ ...s, joinedWorlds: worldIds, loading: false }));
    return worldIds;
  } catch {
    game.update(s => ({ ...s, loading: false }));
    return [];
  }
}

export async function listenToPlayerWorldData(userId, worldKey) {
  if (!userId || !worldKey) return;
  game.update(s => ({ ...s, playerLoaded: false }));
  try {
    const data = await apiGet(`/players/${userId}/worlds/${worldKey}`).catch(() => null);
    game.update(s => ({ ...s, player: data, playerLoaded: true }));
  } catch {
    // Mark loaded even on failure so the UI stops waiting on player data.
    game.update(s => ({ ...s, playerLoaded: true }));
  }
}

export async function getWorldInfo(worldId) {
  if (!worldId || typeof worldId !== 'string') return null;
  game.update(s => ({ ...s, worldLoading: true, error: null }));
  try {
    const info = await apiGet(`/worlds/${worldId}`);
    if (info) {
      game.update(s => ({ ...s, worldLoading: false, worlds: { ...s.worlds, [worldId]: info } }));
      // Pre-populate worldInfo from the HTTP response so NextWorldTick shows immediately
      // (it will be overwritten by WebSocket world_tick when that arrives)
      if (info.lastTick) {
        worldInfo.set({ ...info, loading: false });
      }
    }
    return info;
  } catch (e) {
    game.update(s => ({ ...s, worldLoading: false, error: e.message }));
    return null;
  }
}

export async function getAvailableWorlds() {
  const worlds = await apiGet('/worlds');
  return worlds.map(w => w.id);
}

export async function getWorldMetadata(worldId) {
  if (!worldId) return null;
  const info = await apiGet(`/worlds/${worldId}`).catch(() => null);
  if (info) game.update(s => ({ ...s, worlds: { ...s.worlds, [worldId]: info } }));
  return info;
}

// ---------------------------------------------------------------------------
// World navigation
// ---------------------------------------------------------------------------

export function setCurrentWorld(worldId, _world = null, callback = null) {
  if (!worldId || typeof worldId === 'object') {
    if (callback) callback(null);
    return Promise.resolve(null);
  }
  const wid = String(worldId);
  if (browser) localStorage.setItem(CURRENT_WORLD_KEY, wid);
  if (browser && wid) _clearSavedTargetPosition(wid);

  game.update(s => ({ ...s, worldKey: wid }));
  subscribeToWorldInfo(wid);

  const $user = get(user);
  if ($user?.uid) listenToPlayerWorldData($user.uid, wid);

  return getWorldInfo(wid).then(info => {
    if (callback) callback(info);
    return info;
  });
}

// ---------------------------------------------------------------------------
// Spawn points (reads from loaded world info — no Firebase)
// ---------------------------------------------------------------------------

export function getWorldSpawnPoints(worldId) {
  if (!worldId) return [];
  const world = get(game).worlds?.[worldId];
  if (!world) return [];

  if (world.spawns) return Object.values(world.spawns);
  if (world.chunks) {
    const out = [];
    for (const [, chunk] of Object.entries(world.chunks)) {
      for (const [tileKey, tile] of Object.entries(chunk || {})) {
        if (tile?.structure?.type === 'spawn') {
          const [x, y] = tileKey.split(',').map(Number);
          out.push({ ...tile.structure, position: { x, y }, id: tile.structure.id || `spawn_${x}_${y}` });
        }
      }
    }
    return out;
  }
  return [];
}

export function getWorldCenterCoordinates(worldId) {
  if (!worldId || typeof worldId === 'object') return { x: 0, y: 0 };
  const info = get(game).worlds?.[String(worldId)];
  if (info?.center && typeof info.center.x === 'number') return { x: info.center.x, y: info.center.y };
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
//
// Achievements are granted server-side only (see api/lib/achievements.js) as a
// verified side-effect of the real action. The client never writes them — it
// just reflects unlocks pushed over the `achievement_unlocked` WebSocket event
// (handled in the wsUser subscription above) and shows the popup.

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

let initialized = false;

export function setup() {
  if (!browser || initialized) return Promise.resolve();
  initialized = true;

  return new Promise(resolve => {
    game.update(s => ({ ...s, loading: true, error: null, initialized: false }));

    userAuthReady.subscribe(isReady => {
      if (!isReady) return;
      const $user = get(user);
      if ($user?.uid) {
        loadJoinedWorlds($user.uid);
        if (browser) {
          const savedWorldId = localStorage.getItem(CURRENT_WORLD_KEY);
          if (savedWorldId) {
            game.update(s => ({ ...s, worldKey: savedWorldId }));
            listenToPlayerWorldData($user.uid, savedWorldId);
            subscribeToWorldInfo(savedWorldId);
          }
        }
      }
      game.update(s => ({ ...s, loading: false, initialized: true }));
      resolve();
    });

    user.subscribe($u => {
      if (!initialized) return;
      if ($u?.uid) {
        loadJoinedWorlds($u.uid);
        const wid = get(game).worldKey;
        if (wid) listenToPlayerWorldData($u.uid, wid);
      } else {
        if (_worldInfoUnsub) { _worldInfoUnsub(); _worldInfoUnsub = null; }
        game.update(s => ({ ...s, player: null, playerLoaded: false, joinedWorlds: [] }));
      }
    });
  });
}

export function isPlayerWorldDataReady(worldId) {
  const s = get(game);
  return !!(s.player && s.worldKey === worldId && !s.loading && !s.worldLoading);
}

export function cleanup() {
  if (_worldInfoUnsub) { _worldInfoUnsub(); _worldInfoUnsub = null; }
}

// Convenience wrapper used by some components
export async function cancelMove(groupId, x, y) {
  if (!browser) return { success: false, error: 'Not in browser' };
  const $user  = get(user);
  const $game  = get(game);
  if (!$user?.uid)      return { success: false, error: 'Not authenticated' };
  if (!$game.worldKey)  return { success: false, error: 'No world selected' };
  try {
    const r = await apiPost('/actions/cancelMovement', { worldId: $game.worldKey, groupId, x, y });
    return { success: true, data: r };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Characters — list the player's living, on-map characters and switch which
// one the map follows (the "controlled" character).
export async function listCharacters() {
  if (!browser) return [];
  const $game = get(game);
  if (!$game.worldKey) return [];
  const r = await apiGet(`/worlds/${encodeURIComponent($game.worldKey)}/characters`).catch(() => null);
  return r?.items || [];
}

export async function switchCharacter(lifeId) {
  if (!browser) return { success: false, error: 'Not in browser' };
  const $game = get(game);
  if (!$game.worldKey) return { success: false, error: 'No world selected' };
  try {
    const r = await apiPost(`/worlds/${encodeURIComponent($game.worldKey)}/lives/control`, { lifeId });
    // Reflect the switch locally so the map follows the new character at once.
    game.update(g => {
      if (!g.player) return g;
      return { ...g, player: { ...g.player, controlledLifeId: lifeId, displayName: r?.name ?? g.player.displayName } };
    });
    return { success: true, data: r };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Legacy helper
export function calculateNextTickTime(worldId) {
  const w = get(game).worlds?.[worldId];
  if (!w) return null;
  return (w.lastTick || Date.now()) + Math.round(300000 / (w.speed || 1));
}

export function formatTimeUntilNextTick(worldId) {
  const t = calculateNextTickTime(worldId);
  if (!t) return 'Unknown';
  const rem = t - Date.now();
  if (rem <= 0) return 'Any moment now';
  const m = Math.floor(rem / 60000), s = Math.floor((rem % 60000) / 1000);
  return m <= 0 ? `${s}s` : `${m}m ${s}s`;
}
