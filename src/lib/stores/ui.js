import { writable } from 'svelte/store';

/**
 * Whether the layout header has finished its one-time staggered reveal.
 *
 * The layout mounts once and persists across client-side navigation, so this
 * flips false → true a single time on first load and then stays true. Pages
 * read it to decide whether their own content reveal should wait for the
 * header (first load) or start immediately (every subsequent navigation).
 */
export const headerRevealed = writable(false);

/** Total time (ms) the header takes to finish revealing — kept in sync with
 *  the `header-reveal` stagger in +layout.svelte (last item 550ms delay +
 *  900ms duration). Also used by pages as the base offset for their first-load
 *  content reveal, so content lands only once the header has finished. */
export const HEADER_REVEAL_MS = 1450;
