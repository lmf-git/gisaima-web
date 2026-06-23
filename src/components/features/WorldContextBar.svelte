<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { game, worldInfo } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { entities, coordinates, currentPlayerPosition, moveTarget } from '$lib/stores/map.js';
    import WaxSeal from '../ui/WaxSeal.svelte';
    import Stamp from '../ui/Stamp.svelte';
    import Logo from '../Logo.svelte';
    import HoldingsModal from './HoldingsModal.svelte';
    import { isFood } from 'gisaima-shared/definitions/ITEMS.js';

    // Tapping the resource strip opens a full holdings breakdown. Works on every
    // viewport, but it's the primary way to read resource labels on mobile where
    // the strip collapses to icons + counts.
    let showHoldings = $state(false);

    // HudA top bar — house crest, resources at current location, search,
    // next tick, player avatar. Mirrors reference/jsx/map-hud.jsx HudA.

    const onMap = $derived($page.url?.pathname === '/map');

    const houseName = $derived.by(() => {
        const n = $game?.player?.houseName?.trim();
        return n ? `HOUSE ${n.toUpperCase()}` : '';
    });
    const initial = $derived(($user?.displayName || $user?.email || 'G')[0].toUpperCase());

    // Resources to hand for the player at their current location. Only the
    // player's OWN holdings count: the group they're in (preferred), or the
    // bank of a structure they own here. A structure owned by someone else is
    // shared storage the player can't freely draw on, so it's never shown.
    const resources = $derived.by(() => {
        if (!$currentPlayerPosition || !$user) return { GOLD: 0, FOOD: 0, WOOD: 0, STONE: 0, METAL: 0 };
        const key = `${$currentPlayerPosition.x},${$currentPlayerPosition.y}`;
        const struct = $entities.structure?.[key];
        const groups = $entities.groups?.[key] || [];
        const mine = groups.find((g) => g?.owner === $user.uid);
        const items = (mine?.items && Object.keys(mine.items).length ? mine.items : null)
            || (struct?.owner === $user.uid ? struct?.items : null)
            || {};
        const pick = (...keys) => {
            let n = 0;
            for (const k of new Set(keys)) n += Number(items[k] || 0);
            return n;
        };
        // Food is the sum of every food-flagged item present, not just one crop.
        let food = 0;
        for (const [code, qty] of Object.entries(items)) {
            if (!code.startsWith('_') && isFood(code)) food += Number(qty || 0);
        }
        return {
            GOLD:  pick('GOLD', 'COINS'),
            FOOD:  food,
            WOOD:  pick('WOOD', 'TIMBER', 'OAK_WOOD', 'ANCIENT_WOOD'),
            STONE: pick('STONE'),
            METAL: pick('METAL', 'METAL_ORE')
        };
    });

    // Next-tick countdown driven by `worldInfo.lastTick` + tick interval.
    let now = $state(Date.now());
    let tickTimer;
    onMount(() => { tickTimer = setInterval(() => (now = Date.now()), 1000); });
    onDestroy(() => clearInterval(tickTimer));

    const tickIntervalMs = $derived(($worldInfo?.tickInterval ?? $worldInfo?.tickMs ?? 60_000));
    const nextAt = $derived(
        $worldInfo?.lastTick ? new Date($worldInfo.lastTick).getTime() + tickIntervalMs : null
    );
    const tickLabel = $derived.by(() => {
        if (!nextAt) return '—:—';
        const s = Math.max(0, Math.floor((nextAt - now) / 1000));
        const m = Math.floor(s / 60);
        return `${m}:${String(s % 60).padStart(2, '0')}`;
    });

    // Player points: shown in the house-sub line. Fetched once per world session.
    let playerPoints = $state(null);
    $effect(() => {
        const uid = $user?.uid;
        const wid = $game?.worldKey;
        if (!uid || !wid) { playerPoints = null; return; }
        import('$lib/api.js').then(({ apiGet }) =>
            apiGet(`/worlds/${encodeURIComponent(wid)}/rankings`)
                .then(r => {
                    const me = r?.points?.find(p => p.uid === uid);
                    playerPoints = me?.structurePoints ?? 0;
                })
                .catch(() => { playerPoints = 0; })
        );
    });

    // Jump-to-coordinates search with live dropdown.
    let search = $state('');
    let dropdownOpen = $state(false);
    let closeTimeout = null;

    const MAX_RESULTS = 8;

    const searchResults = $derived.by(() => {
        const v = (search || '').trim();
        if (!v || !onMap) return [];

        // Pure coordinate input — no dropdown, just jump on submit
        if (/^-?\d+\s*[, ]\s*-?\d+$/.test(v)) return [];

        const q = v.toLowerCase();
        const results = [];
        const cells = $coordinates;

        for (const cell of cells) {
            if (results.length >= MAX_RESULTS) break;
            const s = cell.structure;
            if (s) {
                const name = (s.name || s.type || '').replace(/_/g, ' ');
                if (name.toLowerCase().includes(q)) {
                    results.push({ kind: 'structure', label: name, sub: s.type?.replace(/_/g, ' '), x: cell.x, y: cell.y });
                }
            }
        }

        for (const cell of cells) {
            if (results.length >= MAX_RESULTS) break;
            for (const p of (cell.players || [])) {
                if (results.length >= MAX_RESULTS) break;
                if ((p.displayName || '').toLowerCase().includes(q)) {
                    results.push({ kind: 'player', label: p.displayName || 'Player', sub: p.race || '', x: cell.x, y: cell.y });
                }
            }
        }

        return results;
    });

    function jumpTo(x, y) {
        if (onMap) {
            // persist=false: search jumps are transient — don't overwrite the
            // user's saved position so refreshing still restores their last
            // intentional location.
            moveTarget(x, y, false, false);
        } else {
            try {
                localStorage.setItem(`${$game.worldKey}-targetX`, String(x));
                localStorage.setItem(`${$game.worldKey}-targetY`, String(y));
            } catch { /* ignore */ }
            goto('/map');
        }
        search = '';
        dropdownOpen = false;
    }

    function onSearch(e) {
        e.preventDefault();
        const v = (search || '').trim();
        if (!v) return;

        const m = v.match(/^(-?\d+)\s*[, ]\s*(-?\d+)$/);
        if (m) {
            jumpTo(Number(m[1]), Number(m[2]));
            return;
        }

        // Jump to first dropdown result if available
        if (searchResults.length > 0) {
            jumpTo(searchResults[0].x, searchResults[0].y);
            return;
        }

        if (!onMap) goto('/map');
    }

    function onInputFocus() {
        if (closeTimeout) { clearTimeout(closeTimeout); closeTimeout = null; }
        dropdownOpen = true;
    }

    function onInput() {
        // Reopen the dropdown when the user types — focus may already be on the
        // input (e.g. after clicking a result kept focus), so onfocus won't fire.
        dropdownOpen = true;
    }

    function onInputBlur() {
        // Delay so result clicks register before hiding
        closeTimeout = setTimeout(() => { dropdownOpen = false; }, 180);
    }

    function onResultMousedown(e) {
        // Prevent blur from firing before click
        e.preventDefault();
    }

    function fmt(n) {
        if (!n) return '0';
        if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
        return n.toLocaleString();
    }
</script>

{#if $game?.worldKey}
    <header class="dossier" class:not-on-map={!onMap}>
        <!-- Compact Gisaima mark — only surfaces on mobile, where the house
             crest/tagline is hidden, so the bar still carries the brand. -->
        <a class="ctx-logo" href="/" aria-label="Gisaima home">
            <Logo extraClass="ctx-logo-icon" />
        </a>

        <!-- House crest + tagline -->
        <a class="house" href="/house" title="Open house hall">
            <WaxSeal label={initial} color="#5b1a1f" size={32} />
            <div class="house-text">
                <div class="house-name">{houseName}</div>
                <div class="house-sub">
                    Realm of <em>{$game.worldKey}</em>{playerPoints !== null ? ` · ${playerPoints.toLocaleString()} pts` : ''}
                </div>
            </div>
        </a>

        <span class="rule"></span>

        {#if !onMap}
            <a class="back-to-map" href="/map" title="Return to map">
                <Stamp kind="compass" size={14} />
                <span>Map</span>
            </a>
            <span class="rule"></span>
        {/if}

        <!-- Current-location resource strip — tap to open full holdings -->
        <button
            type="button"
            class="res"
            aria-haspopup="dialog"
            title="View all resources & holdings"
            onclick={() => (showHoldings = true)}
        >
            <span class="res-cell">
                <span class="res-icon coin"><Stamp kind="coin" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.GOLD)}</span>
                    <span class="r">Gold</span>
                </span>
            </span>
            <span class="res-cell">
                <span class="res-icon sage"><Stamp kind="wheat" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.FOOD)}</span>
                    <span class="r">Food</span>
                </span>
            </span>
            <span class="res-cell">
                <span class="res-icon gold"><Stamp kind="wood" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.WOOD)}</span>
                    <span class="r">Wood</span>
                </span>
            </span>
            <span class="res-cell">
                <span class="res-icon hill"><Stamp kind="stone" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.STONE)}</span>
                    <span class="r">Stone</span>
                </span>
            </span>
            <span class="res-cell">
                <span class="res-icon iron"><Stamp kind="hammer" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.METAL)}</span>
                    <span class="r">Metal</span>
                </span>
            </span>
        </button>

        <div class="spacer"></div>

        <!-- Search / jump-to-coords -->
        <div class="search-wrap">
            <form class="search" onsubmit={onSearch}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                </svg>
                <input
                    type="text"
                    placeholder="Find player/structure…"
                    bind:value={search}
                    aria-label="Search structures or players, or enter x,y coordinates"
                    oninput={onInput}
                    onfocus={onInputFocus}
                    onblur={onInputBlur}
                />
                <kbd>⏎</kbd>
            </form>
            {#if dropdownOpen && searchResults.length > 0}
                <ul class="search-dropdown" role="listbox">
                    {#each searchResults as r}
                        <li
                            class="search-result"
                            role="option"
                            aria-selected="false"
                            onmousedown={onResultMousedown}
                            onclick={() => jumpTo(r.x, r.y)}
                            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && jumpTo(r.x, r.y)}
                        >
                            <span class="result-kind">{r.kind === 'player' ? '⚔' : '⬛'}</span>
                            <span class="result-label">{r.label}</span>
                            {#if r.sub}
                                <span class="result-sub">{r.sub}</span>
                            {/if}
                            <span class="result-coords">{r.x},{r.y}</span>
                        </li>
                    {/each}
                    <li class="search-hint">Showing visible tiles only</li>
                </ul>
            {/if}
        </div>

        <!-- Next tick pill -->
        <a class="tick" href="/pending" title="Pending events">
            <span class="tick-dot"></span>
            <span class="tick-lbl">NEXT TICK</span>
            <span class="tick-val">{tickLabel}</span>
        </a>

        <!-- Player avatar — the house crest carries it on desktop but is hidden
             on mobile, so surface a tappable profile avatar here instead. -->
        <a class="ctx-avatar" href="/profile" aria-label="Your realm profile" title="Your realm profile">
            <WaxSeal label={initial} color="#5b1a1f" size={28} />
        </a>
    </header>

    {#if showHoldings}
        <HoldingsModal
            {resources}
            onClose={() => (showHoldings = false)}
            onJump={jumpTo}
        />
    {/if}
{/if}

<style>
    /* HudA-faithful top bar — sits at top of every world-scoped route.
       Background, height (56px ~ 3.5em), borders and chrome all match
       reference/jsx/map-hud.jsx. */
    .dossier {
        position: fixed;
        top: 0;
        /* On the map, the LeftRail occupies the leftmost 3.5em (~56px) of the
           viewport top-to-bottom. Reserve that column so the dossier starts
           to the right of the rail, exactly like reference HudA. */
        left: var(--dossier-left, 0);
        right: 0;
        z-index: 80;
        display: flex;
        align-items: center;
        gap: 0.875em;
        height: 3.5em;
        padding: 0 1.15em;
        background: linear-gradient(180deg, var(--chrome-panel-a), var(--chrome-panel-b));
        border-bottom: 0.075em solid var(--chrome-border);
        color: var(--chrome-text);
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
        /* No backdrop-filter: the gradient background is already opaque, so the
           blur added nothing but a compositing layer that glitched the page
           background (notably the worlds loader) behind it. */
    }
    /* The LeftRail appears on map + all world-scoped pages; offset the dossier. */
    :global(.app.map) .dossier,
    :global(.app.world-scoped) .dossier { --dossier-left: 5em; }
    @media (max-width: 700px) {
        :global(.app.map) .dossier,
        :global(.app.world-scoped) .dossier { --dossier-left: 0; }
    }

    /* Compact brand mark — desktop hides it (the house crest carries identity
       there); it only appears in the mobile layout below. */
    .ctx-logo {
        display: none;
        align-items: center;
        flex-shrink: 0;
        color: var(--chrome-gold);
    }
    .ctx-logo :global(.ctx-logo-icon) {
        height: 2em;
        width: auto;
        display: block;
    }

    /* Player profile avatar — mobile only; the house crest carries identity on
       desktop. Sits at the right end of the bar. */
    .ctx-avatar {
        display: none;
        align-items: center;
        flex-shrink: 0;
        text-decoration: none;
    }

    /* House crest block */
    .house {
        display: inline-flex;
        align-items: center;
        gap: 0.65em;
        color: var(--chrome-text);
        text-decoration: none;
        flex-shrink: 0;
    }
    .house-text { line-height: 1.05; }
    .house-name {
        font-family: var(--font-display);
        font-size: 0.82em;
        letter-spacing: 0.14em;
        white-space: nowrap;
    }
    .house-sub {
        font-family: var(--font-mono);
        font-size: 0.62em;
        opacity: 0.65;
        margin-top: 0.15em;
        white-space: nowrap;
    }
    .house-sub em { color: var(--chrome-gold); font-style: normal; }

    .rule {
        width: 0.075em;
        height: 1.75em;
        background: var(--chrome-hairline);
        flex-shrink: 0;
    }

    .back-to-map {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        padding: 0.4em 0.75em;
        background: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-aged-gold);
        font-family: var(--font-display);
        font-size: 0.7em;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        text-decoration: none;
        white-space: nowrap;
        flex-shrink: 0;
        transition: background 0.15s ease, border-color 0.15s ease;
    }
    .back-to-map:hover {
        background: var(--color-gold-pale);
        border-color: var(--color-gold-pale);
    }
    .back-to-map :global(svg) { color: var(--color-ink-900); }

    /* Resource cells */
    .res {
        list-style: none;
        padding: 0.3em 0;
        margin: 0;
        display: inline-flex;
        align-items: center;
        font-family: var(--font-mono);
        color: inherit;
        flex-shrink: 0;
        cursor: pointer;
        background: none;
        border: 0.075em solid transparent;
        transition: background 0.12s, border-color 0.12s;
    }
    .res:hover,
    .res:focus-visible {
        background: var(--chrome-gold-soft);
        border-color: var(--chrome-gold-border);
        outline: none;
    }
    .res-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        padding: 0 0.85em;
        border-left: 0.075em solid var(--chrome-hairline);
    }
    .res-cell:first-child { border-left: none; }
    .res-icon.coin  { color: var(--chrome-gold); }
    .res-icon.sage  { color: var(--color-sage-pale, #b8c9b3); }
    .res-icon.gold  { color: var(--color-aged-gold); }
    .res-icon.hill  { color: #a89567; }
    .res-icon.iron  { color: #9fb0bd; }
    .res-val { line-height: 1; }
    .res-val .n { display: block; font-size: 0.82em; font-weight: 500; color: var(--chrome-text); }
    .res-val .r { display: block; font-size: 0.55em; opacity: 0.5; letter-spacing: 0.04em; margin-top: 0.15em; }

    .spacer { flex: 1 1 auto; }

    /* Search — unified pill: icon + input + kbd share one background/border */
    .search {
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        background: var(--chrome-field-bg);
        border: 0.075em solid var(--chrome-field-border);
        padding: 0.4em 0.85em;
        width: 22em;
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--chrome-text-dim);
        flex-shrink: 0;
        transition: border-color 0.15s, background 0.15s;
    }
    .search:focus-within {
        border-color: var(--chrome-gold-border);
        background: var(--chrome-field-bg);
        color: var(--chrome-text);
    }
    .search input {
        flex: 1;
        min-width: 0;
        height: 100%;
        background: transparent;
        border: none;
        box-shadow: none;
        outline: none;
        color: var(--chrome-text);
        font-family: inherit;
        font-size: inherit;
        padding: 0;
        line-height: 1;
    }
    .search input::placeholder {
        color: var(--chrome-text-faint);
    }
    /* Icon and kbd inherit the form's color — no isolated backgrounds or borders */
    .search svg { color: inherit; flex-shrink: 0; }
    .search kbd {
        margin-left: auto;
        font-size: 0.8em;
        opacity: 0.5;
        font-family: inherit;
        flex-shrink: 0;
        color: inherit;
    }

    /* Next tick pill */
    .tick {
        display: inline-flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.4em 0.85em;
        background: var(--chrome-gold-soft);
        border: 0.075em solid var(--chrome-gold-border);
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--chrome-gold);
        text-decoration: none;
        flex-shrink: 0;
    }
    .tick:hover { background: var(--chrome-gold-soft); }
    .tick-dot {
        width: 0.375em;
        height: 0.375em;
        border-radius: 50%;
        background: var(--chrome-gold);
        box-shadow: 0 0 0.5em var(--chrome-gold);
        animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 0.55; }
        50%      { opacity: 1; }
    }
    .tick-lbl {
        font-size: 0.6em;
        letter-spacing: 0.16em;
        opacity: 0.7;
    }
    .tick-val {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--chrome-gold);
    }

    @media (max-width: 1200px) {
        .res-cell:nth-child(n+3) { display: none; }   /* keep first 2 cells */
        .search { width: 16em; }
    }
    @media (max-width: 900px) {
        .res { display: none; }
        .house-sub { display: none; }
        .search { width: 12em; }
        .tick-lbl { display: none; }
    }
    @media (max-width: 700px) {
        .dossier { padding: 0 0.65em; gap: 0.5em; }
        .rule { display: none; }
        .search-wrap { display: none; }
        .tick { padding: 0.3em 0.6em; }

        /* Swap the house crest for the Gisaima mark and bring the resource
           strip back — together they fit the freed-up width. */
        .ctx-logo { display: inline-flex; }
        .house { display: none; }

        .res { display: inline-flex; }
        .res-cell { padding: 0 0.45em; gap: 0.3em; border-left: none; }
        .res-cell:nth-child(n+3) { display: inline-flex; }  /* show all five again */
        .res-val .r { display: none; }   /* drop the word, keep icon + count */
        .res-icon :global(svg) { width: 0.9em; height: 0.9em; }

        /* Surface the profile avatar now the house crest is hidden. */
        .ctx-avatar { display: inline-flex; }

        /* Hide resources when the back-to-map button is visible — not enough space for both. */
        .dossier.not-on-map .res { display: none; }
    }

    /* Search wrapper — positions the dropdown relative to the pill */
    .search-wrap {
        position: relative;
        flex-shrink: 0;
    }

    .search-dropdown {
        position: absolute;
        top: calc(100% + 0.35em);
        left: 0;
        right: 0;
        list-style: none;
        margin: 0;
        padding: 0;
        background: var(--chrome-panel-a);
        border: 0.075em solid var(--chrome-gold-border);
        border-top: none;
        z-index: 2000;
        max-height: 18em;
        overflow-y: auto;
    }

    .search-result {
        display: flex;
        align-items: center;
        gap: 0.55em;
        padding: 0.55em 0.85em;
        cursor: pointer;
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--chrome-text-dim);
        border-bottom: 0.075em solid var(--chrome-hairline);
        transition: background 0.1s;
    }
    .search-result:hover {
        background: var(--chrome-gold-soft);
        color: var(--chrome-text);
    }

    .result-kind {
        font-size: 0.8em;
        opacity: 0.6;
        flex-shrink: 0;
    }
    .result-label {
        font-weight: 500;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .result-sub {
        font-size: 0.85em;
        opacity: 0.5;
        text-transform: capitalize;
        flex-shrink: 0;
    }
    .result-coords {
        font-size: 0.8em;
        color: var(--color-wax-red, #5b1a1f);
        flex-shrink: 0;
        margin-left: auto;
        padding-left: 0.5em;
    }
    .search-hint {
        padding: 0.4em 0.85em;
        font-family: var(--font-mono);
        font-size: 0.68em;
        opacity: 0.4;
        font-style: italic;
        color: var(--chrome-text);
    }
</style>
