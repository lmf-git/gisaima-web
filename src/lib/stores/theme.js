import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Site-wide light/dark theme. The actual palette swap is CSS-driven via the
// `data-theme` attribute on <html> (see the dark-theme block in +layout.svelte).
// A matching inline script in app.html sets the attribute before first paint so
// there's no flash of the wrong theme on load.
const KEY = 'gisaima-theme';

function initial() {
  if (!browser) return 'light';
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'dark' || t === 'light') return t;
  } catch { /* ignore */ }
  return 'light';
}

export const theme = writable(initial());

function apply(t) {
  if (!browser) return;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export function toggleTheme() {
  theme.update(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    apply(next);
    return next;
  });
}

export function setTheme(t) {
  if (t !== 'dark' && t !== 'light') return;
  theme.set(t);
  apply(t);
}
