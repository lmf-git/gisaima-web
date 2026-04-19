import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { apiGet, apiPost } from '../api.js';

function createDiplomacyStore() {
  const { subscribe, set, update } = writable({ tribes: [], loading: false, myTribe: null });

  return {
    subscribe,

    async fetchTribes(worldId) {
      if (!worldId || !browser) return;
      update(s => ({ ...s, loading: true }));
      try {
        const tribes = await apiGet(`/worlds/${worldId}/tribes`);
        update(s => ({
          ...s,
          loading: false,
          tribes: Array.isArray(tribes) ? tribes : [],
        }));
      } catch {
        update(s => ({ ...s, loading: false }));
      }
    },

    async createTribe(worldId, name, tag, description) {
      const result = await apiPost(`/worlds/${worldId}/tribes`, { name, tag, description });
      if (result.success) {
        update(s => ({ ...s, tribes: [...s.tribes, result.tribe] }));
      }
      return result;
    },

    async joinTribe(worldId, tribeId) {
      const result = await apiPost(`/worlds/${worldId}/tribes/join`, { tribeId });
      if (result.success) await this.fetchTribes(worldId);
      return result;
    },

    async leaveTribe(worldId) {
      const result = await apiPost(`/worlds/${worldId}/tribes/leave`, {});
      if (result.success) await this.fetchTribes(worldId);
      return result;
    },
  };
}

export const diplomacy = createDiplomacyStore();

export function getMyTribe(tribes, uid) {
  return tribes.find(t => t.members?.some(m => m.uid === uid)) || null;
}
