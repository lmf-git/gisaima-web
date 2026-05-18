<script>
    // Hand-drawn ink-stamp icons — port of reference Stamp.* glyphs.
    // kind: 'compass'|'sword'|'shield'|'tower'|'scroll'|'coin'|'wheat'|'stone'|'wood'|'raven'|'skull'|'crown'|'banner'|'eye'|'plus'|'hammer'|'star'|'cross'|'crossed-swords'
    let { kind = 'compass', size = 20 } = $props();
</script>

{#if kind === 'compass'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="6.5" stroke-dasharray="0.5 2" />
        <path d="M12 3.5 13.6 11 12 12 10.4 11Z" fill="currentColor" />
        <path d="M12 20.5 10.4 13 12 12 13.6 13Z" />
    </svg>
{:else if kind === 'sword'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20l3.5-.5L20 7l-3-3L4.5 16.5Z" fill="currentColor" fill-opacity=".12" />
        <path d="m4 20 7-7" />
        <path d="m14 7 3 3" />
        <path d="m8 16-2 2" />
    </svg>
{:else if kind === 'shield'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3 5 5.5v7c0 4 3 7 7 8.5 4-1.5 7-4.5 7-8.5v-7L12 3Z" fill="currentColor" fill-opacity=".1" />
        <path d="M12 8v6M9 11h6" />
    </svg>
{:else if kind === 'tower'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
        <path d="M7 21V9l-1-1V5h1v1h2V5h1v1h2V5h1v1h2V5h1v3l-1 1v12Z" fill="currentColor" fill-opacity=".12" />
        <path d="M10 21v-4h4v4M9 13h6M9 16h6" />
    </svg>
{:else if kind === 'scroll'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 4h12a2 2 0 0 1 2 2v1H8" fill="currentColor" fill-opacity=".1" />
        <path d="M5 4a2 2 0 0 0-2 2v1h5" />
        <path d="M8 7v11a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7" />
        <path d="M11 11h7M11 14h7M11 17h5" />
    </svg>
{:else if kind === 'coin'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3">
        <circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".14" />
        <path d="M12 7v10M9.5 9c0-1 1.2-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5h-1c-1.5 0-2.5.5-2.5 1.5s1.2 1.5 2.5 1.5 2.5-.5 2.5-1.5" stroke-linecap="round" />
    </svg>
{:else if kind === 'wheat'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 21V8" />
        <path d="M12 8c-2 0-3-1-3-3 2 0 3 1 3 3Z" fill="currentColor" fill-opacity=".15" />
        <path d="M12 8c2 0 3-1 3-3-2 0-3 1-3 3Z" fill="currentColor" fill-opacity=".15" />
        <path d="M12 12c-2 0-3-1-3-3 2 0 3 1 3 3Z" fill="currentColor" fill-opacity=".15" />
        <path d="M12 12c2 0 3-1 3-3-2 0-3 1-3 3Z" fill="currentColor" fill-opacity=".15" />
        <path d="M12 16c-2 0-3-1-3-3 2 0 3 1 3 3Z" fill="currentColor" fill-opacity=".15" />
        <path d="M12 16c2 0 3-1 3-3-2 0-3 1-3 3Z" fill="currentColor" fill-opacity=".15" />
    </svg>
{:else if kind === 'stone'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
        <path d="M6 15 4 12l3-4 5-2 5 2 3 4-2 3-3 4H9Z" fill="currentColor" fill-opacity=".14" />
        <path d="M9 10l3 1 3-1M12 11v4" />
    </svg>
{:else if kind === 'wood'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="8" fill="currentColor" fill-opacity=".12" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="m6 6 12 12M6 18 18 6" />
    </svg>
{:else if kind === 'raven'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M3 14c0-3 2-5 5-5l3-2 2 1 4-1 1 2-2 2 2 1-1 2-3 1-1 3-2-1-3 1-2-1c-3 0-3-3-3-3Z" />
    </svg>
{:else if kind === 'skull'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M6 11a6 6 0 1 1 12 0v3l-1 1v3h-2v-2h-1v2h-4v-2H9v2H7v-3l-1-1Z" fill="currentColor" fill-opacity=".15" />
        <circle cx="9.5" cy="12" r="1.3" fill="currentColor" />
        <circle cx="14.5" cy="12" r="1.3" fill="currentColor" />
        <path d="M11 16h2" />
    </svg>
{:else if kind === 'crown'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
        <path d="m4 9 2 9h12l2-9-5 3-3-6-3 6Z" fill="currentColor" fill-opacity=".18" />
        <circle cx="4" cy="9" r="1" fill="currentColor" />
        <circle cx="12" cy="6" r="1" fill="currentColor" />
        <circle cx="20" cy="9" r="1" fill="currentColor" />
    </svg>
{:else if kind === 'banner'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M6 3v18l3-3 3 3 3-3 3 3V3Z" fill="currentColor" fill-opacity=".18" />
        <path d="M9 8h6M9 12h6" />
    </svg>
{:else if kind === 'eye'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
{:else if kind === 'plus'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M12 5v14M5 12h14" />
    </svg>
{:else if kind === 'hammer'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">
        <path d="M14 3h6v6l-3-1-3 3 3 3-3 3-3-3 3-3-3-3Z" fill="currentColor" fill-opacity=".18" />
        <path d="m11 12-7 7 2 2 7-7" />
    </svg>
{:else if kind === 'star'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12 2l2.6 6.6L21.5 9l-5.3 4.6 1.7 7-5.9-3.8L6.1 20.6l1.7-7L2.5 9l6.9-.4L12 2z" />
    </svg>
{:else if kind === 'cross'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
        <path d="M12 2l1.5 7.5L21 11l-7.5 1.5L12 22l-1.5-9.5L3 11l7.5-1.5L12 2z" />
    </svg>
{:else if kind === 'crossed-swords'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4l8 8m0 0l-3 .5L7 14l-3 3 1 2 2 1 3-3 1.5-2L12 12z" fill="currentColor" fill-opacity=".15" />
        <path d="M20 4l-8 8m0 0l3 .5 2 1.5 3 3-1 2-2 1-3-3-1.5-2L12 12z" fill="currentColor" fill-opacity=".15" />
    </svg>
{/if}
