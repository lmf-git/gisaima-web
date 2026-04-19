import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { apiGet, apiPost } from '../api.js';

function createReportsStore() {
  const { subscribe, set, update } = writable({ reports: [], loading: false });

  return {
    subscribe,

    async fetch(worldId) {
      if (!worldId || !browser) return;
      update(s => ({ ...s, loading: true }));
      try {
        const reports = await apiGet(`/worlds/${worldId}/reports`);
        set({ reports: Array.isArray(reports) ? reports : [], loading: false });
      } catch {
        update(s => ({ ...s, loading: false }));
      }
    },

    async markRead(worldId, reportId) {
      try {
        await apiPost(`/worlds/${worldId}/reports/${reportId}`, {});
        update(s => ({
          ...s,
          reports: s.reports.map(r => r._id === reportId ? { ...r, read: true } : r),
        }));
      } catch { /* ignore */ }
    },
  };
}

export const reports = createReportsStore();
export const unreadReports = derived(reports, $r => $r.reports.filter(r => !r.read).length);
