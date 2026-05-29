<script>
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { game, worldInfo } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { entities, coordinates, currentPlayerPosition, moveTarget } from '$lib/stores/map.js';
    import WaxSeal from '../ui/WaxSeal.svelte';
    import Stamp from '../ui/Stamp.svelte';

    // HudA top bar — house crest, resources at current location, search,
    // next tick, player avatar. Mirrors reference/jsx/map-hud.jsx HudA.

    const onMap = $derived($page.url?.pathname === '/map');

    const houseName = $derived.by(() => {
        const n = $user?.displayName || $user?.email?.split('@')[0] || 'guest';
        return `HOUSE ${n.toString().toUpperCase()}`;
    });
    const initial = $derived(($user?.displayName || $user?.email || 'G')[0].toUpperCase());

    // Resources read from the player's current-location sink (group preferred
    // over structure) so the bar shows what's actually to hand.
    const resources = $derived.by(() => {
        if (!$currentPlayerPosition || !$user) return { GOLD: 0, WHEAT: 0, WOOD: 0, STONE: 0 };
        const key = `${$currentPlayerPosition.x},${$currentPlayerPosition.y}`;
        const struct = $entities.structure?.[key];
        const groups = $entities.groups?.[key] || [];
        const mine = groups.find((g) => g?.owner === $user.uid);
        const items = (mine?.items && Object.keys(mine.items).length ? mine.items : null)
            || (struct?.owner === $user.uid ? struct?.items : null)
            || (struct?.items || {});
        const pick = (...keys) => {
            let n = 0;
            for (const k of keys) n += Number(items[k] || 0);
            return n;
        };
        return {
            GOLD:  pick('GOLD', 'COINS'),
            WHEAT: pick('WHEAT', 'GRAIN', 'BERRIES'),
            WOOD:  pick('WOOD', 'WOODEN_STICKS', 'TIMBER'),
            STONE: pick('STONE', 'STONE_PIECES', 'IRON_ORE', 'IRON')
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
    <header class="dossier">
        <!-- House crest + tagline -->
        <a class="house" href="/profile" title="Open profile">
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

        <!-- Current-location resource strip -->
        <ul class="res">
            <li>
                <span class="res-icon coin"><Stamp kind="coin" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.GOLD)}</span>
                    <span class="r">@here</span>
                </span>
            </li>
            <li>
                <span class="res-icon sage"><Stamp kind="wheat" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.WHEAT)}</span>
                    <span class="r">@here</span>
                </span>
            </li>
            <li>
                <span class="res-icon gold"><Stamp kind="wood" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.WOOD)}</span>
                    <span class="r">@here</span>
                </span>
            </li>
            <li>
                <span class="res-icon hill"><Stamp kind="stone" size={16} /></span>
                <span class="res-val">
                    <span class="n">{fmt(resources.STONE)}</span>
                    <span class="r">@here</span>
                </span>
            </li>
        </ul>

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
    </header>
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
        background: linear-gradient(180deg, rgba(14, 19, 32, 0.92), rgba(14, 19, 32, 0.78));
        border-bottom: 0.075em solid rgba(255, 255, 255, 0.08);
        color: var(--color-parchment-100);
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
        backdrop-filter: blur(0.5em);
    }
    /* The LeftRail appears on map + all world-scoped pages; offset the dossier. */
    :global(.app.map) .dossier,
    :global(.app.world-scoped) .dossier { --dossier-left: 5em; }
    @media (max-width: 700px) {
        :global(.app.map) .dossier,
        :global(.app.world-scoped) .dossier { --dossier-left: 0; }
    }

    /* House crest block */
    .house {
        display: inline-flex;
        align-items: center;
        gap: 0.65em;
        color: var(--color-parchment-100);
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
    .house-sub em { color: var(--color-gold-pale); font-style: normal; }

    .rule {
        width: 0.075em;
        height: 1.75em;
        background: rgba(255, 255, 255, 0.1);
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
        padding: 0;
        margin: 0;
        display: inline-flex;
        font-family: var(--font-mono);
        flex-shrink: 0;
    }
    .res li {
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        padding: 0 0.85em;
        border-left: 0.075em solid rgba(255, 255, 255, 0.07);
    }
    .res li:first-child { border-left: none; }
    .res-icon.coin  { color: var(--color-gold-pale); }
    .res-icon.sage  { color: var(--color-sage-pale, #b8c9b3); }
    .res-icon.gold  { color: var(--color-aged-gold); }
    .res-icon.hill  { color: #a89567; }
    .res-val { line-height: 1; }
    .res-val .n { display: block; font-size: 0.82em; font-weight: 500; color: var(--color-parchment-100); }
    .res-val .r { display: block; font-size: 0.55em; opacity: 0.5; letter-spacing: 0.04em; margin-top: 0.15em; }

    .spacer { flex: 1 1 auto; }

    /* Search — unified pill: icon + input + kbd share one background/border */
    .search {
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        background: rgba(255, 255, 255, 0.06);
        border: 0.075em solid rgba(255, 255, 255, 0.14);
        padding: 0.4em 0.85em;
        width: 22em;
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: rgba(251, 246, 231, 0.55);
        flex-shrink: 0;
        transition: border-color 0.15s, background 0.15s;
    }
    .search:focus-within {
        border-color: rgba(176, 141, 74, 0.6);
        background: rgba(255, 255, 255, 0.09);
        color: rgba(251, 246, 231, 0.75);
    }
    .search input {
        flex: 1;
        min-width: 0;
        height: 100%;
        background: transparent;
        border: none;
        box-shadow: none;
        outline: none;
        color: var(--color-parchment-100);
        font-family: inherit;
        font-size: inherit;
        padding: 0;
        line-height: 1;
    }
    .search input::placeholder {
        color: rgba(251, 246, 231, 0.32);
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
        background: rgba(176, 141, 74, 0.12);
        border: 0.075em solid rgba(176, 141, 74, 0.3);
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--color-gold-pale);
        text-decoration: none;
        flex-shrink: 0;
    }
    .tick:hover { background: rgba(176, 141, 74, 0.2); }
    .tick-dot {
        width: 0.375em;
        height: 0.375em;
        border-radius: 50%;
        background: var(--color-gold-pale);
        box-shadow: 0 0 0.5em var(--color-gold-pale);
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
        color: var(--color-gold-pale);
    }

    @media (max-width: 1200px) {
        .res li:nth-child(n+3) { display: none; }   /* keep first 2 cells */
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
        .house-text { display: none; }
        .search-wrap { display: none; }
        .tick { padding: 0.3em 0.6em; }
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
        background: rgba(14, 19, 32, 0.97);
        border: 0.075em solid rgba(176, 141, 74, 0.4);
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
        color: var(--color-parchment-200, rgba(232, 228, 210, 0.8));
        border-bottom: 0.075em solid rgba(255, 255, 255, 0.05);
        transition: background 0.1s;
    }
    .search-result:hover {
        background: rgba(176, 141, 74, 0.14);
        color: var(--color-parchment-100);
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
        color: var(--color-parchment-100);
    }
</style>
