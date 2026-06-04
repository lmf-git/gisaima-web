<script>
    import { fade, scale } from 'svelte/transition';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
    import Stamp from '../ui/Stamp.svelte';

    // Resource summary at the player's current location (with labels) plus a
    // lazy-loaded, full breakdown of every structure and unit group they own.
    const {
        resources = { GOLD: 0, FOOD: 0, WOOD: 0, STONE: 0, METAL: 0 },
        onClose = () => {},
        onJump = () => {},
    } = $props();

    // The five summary rows mirror the header strip, but always with labels.
    const summary = [
        { key: 'GOLD',  kind: 'coin',   label: 'Gold' },
        { key: 'FOOD',  kind: 'wheat',  label: 'Food' },
        { key: 'WOOD',  kind: 'wood',   label: 'Wood' },
        { key: 'STONE', kind: 'stone',  label: 'Stone' },
        { key: 'METAL', kind: 'hammer', label: 'Metal' },
    ];

    let expanded = $state(false);
    let loading = $state(false);
    let error = $state(false);
    let holdings = $state(null); // { structures: [], groups: [] }

    function fmt(n) {
        n = Number(n) || 0;
        if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
        return n.toLocaleString();
    }

    // Items map → sorted [{ code, name, qty }], dropping metadata keys (_x, _y).
    function itemList(items) {
        if (!items) return [];
        return Object.entries(items)
            .filter(([code, qty]) => !code.startsWith('_') && Number(qty) > 0)
            .map(([code, qty]) => ({ code, qty: Number(qty), name: ITEMS[code]?.name || code }))
            .sort((a, b) => b.qty - a.qty);
    }

    async function loadHoldings() {
        const wid = $game?.worldKey;
        if (!wid) return;
        loading = true;
        error = false;
        try {
            const r = await apiGet(`/worlds/${encodeURIComponent(wid)}/holdings`);
            holdings = {
                structures: Array.isArray(r?.structures) ? r.structures : [],
                groups: Array.isArray(r?.groups) ? r.groups : [],
            };
        } catch {
            error = true;
        } finally {
            loading = false;
        }
    }

    function toggleExpand() {
        expanded = !expanded;
        if (expanded && !holdings && !loading) loadHoldings();
    }

    // Flat, location-ordered list of every holding for the expanded view.
    const allHoldings = $derived.by(() => {
        if (!holdings) return [];
        const rows = [
            ...holdings.structures.map(s => ({
                kind: 'structure',
                title: s.name || (s.type ? s.type.replace(/_/g, ' ') : 'Structure'),
                sub: s.type ? s.type.replace(/_/g, ' ') : 'Structure',
                x: s.x, y: s.y,
                items: itemList(s.items),
            })),
            ...holdings.groups.map(g => ({
                kind: 'group',
                title: g.name || 'Unit group',
                sub: g.status || 'idle',
                x: g.x, y: g.y,
                items: itemList(g.items),
            })),
        ];
        return rows;
    });

    function jump(x, y) {
        onJump(x, y);
        onClose();
    }
</script>

<div
    class="holdings-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Your resources and holdings"
    transition:fade={{ duration: 150 }}
    onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
    tabindex="-1"
>
    <div class="holdings-panel" transition:scale={{ duration: 160, start: 0.96 }}>
        <header class="hd">
            <h2>Resources</h2>
            <button class="close" onclick={onClose} aria-label="Close">✕</button>
        </header>

        <p class="hd-sub">At your current location</p>
        <ul class="summary">
            {#each summary as s}
                <li>
                    <span class="ic"><Stamp kind={s.kind} size={16} /></span>
                    <span class="lbl">{s.label}</span>
                    <span class="val">{fmt(resources[s.key])}</span>
                </li>
            {/each}
        </ul>

        <button class="expand-toggle" onclick={toggleExpand} aria-expanded={expanded}>
            <span>{expanded ? 'Hide all holdings' : 'Show all holdings'}</span>
            <span class="chev" class:open={expanded}>▾</span>
        </button>

        {#if expanded}
            <div class="all">
                {#if loading}
                    <p class="state">Gathering your holdings…</p>
                {:else if error}
                    <p class="state error">Couldn't load holdings. Try again.</p>
                {:else if allHoldings.length === 0}
                    <p class="state">You hold no structures or groups yet.</p>
                {:else}
                    {#each allHoldings as h}
                        <div class="holding" class:group={h.kind === 'group'}>
                            <div class="holding-hd">
                                <span class="badge">{h.kind === 'group' ? 'GROUP' : 'STRUCTURE'}</span>
                                <span class="h-title">{h.title}</span>
                                <button class="coord" onclick={() => jump(h.x, h.y)} title="Jump to location">
                                    @{h.x},{h.y}
                                </button>
                            </div>
                            <div class="h-sub">{h.sub}</div>
                            {#if h.items.length}
                                <ul class="items">
                                    {#each h.items as it}
                                        <li><span class="i-name">{it.name}</span><span class="i-qty">{fmt(it.qty)}</span></li>
                                    {/each}
                                </ul>
                            {:else}
                                <div class="empty">No items stored</div>
                            {/if}
                        </div>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .holdings-overlay {
        position: fixed;
        inset: 0;
        z-index: 9000;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 4em 1em 2em;
        backdrop-filter: blur(2px);
    }

    .holdings-panel {
        width: min(420px, 100%);
        max-height: 82vh;
        overflow-y: auto;
        background: linear-gradient(160deg, var(--chrome-panel-a), var(--chrome-panel-b));
        border: 0.075em solid var(--chrome-gold-border);
        color: var(--chrome-text);
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
        box-shadow: 0 0.5em 2.5em var(--chrome-shadow, rgba(0, 0, 0, 0.6));
        scrollbar-width: thin;
    }

    .hd {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.7em 0.9em 0.5em;
        border-bottom: 0.075em solid var(--chrome-hairline);
        position: sticky;
        top: 0;
        background: var(--chrome-gold-soft);
        z-index: 1;
    }
    .hd h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 0.78em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--chrome-gold);
    }
    .close {
        background: none;
        border: none;
        color: var(--chrome-text-dim);
        font-size: 0.9em;
        cursor: pointer;
        padding: 0.2em 0.4em;
        line-height: 1;
    }
    .close:hover { color: var(--chrome-text); }

    .hd-sub {
        margin: 0;
        padding: 0.6em 0.9em 0.3em;
        font-family: var(--font-mono);
        font-size: 0.62em;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--chrome-text-dim);
        opacity: 0.7;
    }

    .summary {
        list-style: none;
        margin: 0;
        padding: 0.2em 0.9em 0.7em;
        display: flex;
        flex-direction: column;
        gap: 0.1em;
    }
    .summary li {
        display: flex;
        align-items: center;
        gap: 0.6em;
        padding: 0.35em 0;
        border-bottom: 0.04em solid var(--chrome-hairline);
        font-family: var(--font-mono);
    }
    .summary li:last-child { border-bottom: none; }
    .summary .ic { color: var(--chrome-gold); display: inline-flex; flex-shrink: 0; }
    .summary .lbl { flex: 1; font-size: 0.78em; color: var(--chrome-text); }
    .summary .val { font-size: 0.82em; font-weight: 600; color: var(--chrome-gold); }

    .expand-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.6em 0.9em;
        background: var(--chrome-field-bg);
        border: none;
        border-top: 0.075em solid var(--chrome-hairline);
        border-bottom: 0.075em solid var(--chrome-hairline);
        color: var(--chrome-text-dim);
        font-family: var(--font-display);
        font-size: 0.66em;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
    }
    .expand-toggle:hover { background: var(--chrome-gold-soft); color: var(--chrome-text); }
    .chev { transition: transform 0.18s; }
    .chev.open { transform: rotate(180deg); }

    .all { padding: 0.5em 0.9em 0.9em; display: flex; flex-direction: column; gap: 0.5em; }

    .state {
        margin: 0;
        padding: 1em 0;
        text-align: center;
        font-family: var(--font-mono);
        font-size: 0.72em;
        color: var(--chrome-text-dim);
        font-style: italic;
    }
    .state.error { color: var(--color-wax-red, #b4502d); }

    .holding {
        border: 0.075em solid var(--chrome-hairline);
        background: var(--chrome-card, rgba(255, 255, 255, 0.02));
        padding: 0.5em 0.6em;
    }
    .holding.group { border-left: 0.18em solid var(--color-aged-gold, #b08d4a); }
    .holding:not(.group) { border-left: 0.18em solid var(--chrome-gold-border); }

    .holding-hd {
        display: flex;
        align-items: center;
        gap: 0.5em;
    }
    .badge {
        font-family: var(--font-mono);
        font-size: 0.52em;
        letter-spacing: 0.1em;
        padding: 0.15em 0.4em;
        background: var(--chrome-gold-soft);
        color: var(--chrome-gold);
        flex-shrink: 0;
    }
    .h-title {
        flex: 1;
        min-width: 0;
        font-size: 0.8em;
        font-weight: 600;
        color: var(--chrome-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .coord {
        flex-shrink: 0;
        background: rgba(176, 141, 74, 0.12);
        border: 0.075em solid rgba(176, 141, 74, 0.3);
        color: var(--color-aged-gold, #b08d4a);
        font-family: var(--font-mono);
        font-size: 0.66em;
        padding: 0.15em 0.4em;
        cursor: pointer;
        transition: background 0.12s;
    }
    .coord:hover { background: rgba(176, 141, 74, 0.25); }

    .h-sub {
        font-family: var(--font-mono);
        font-size: 0.6em;
        letter-spacing: 0.05em;
        text-transform: capitalize;
        color: var(--chrome-text-dim);
        opacity: 0.65;
        margin: 0.25em 0 0.1em;
    }

    .items {
        list-style: none;
        margin: 0.3em 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.05em;
    }
    .items li {
        display: flex;
        justify-content: space-between;
        gap: 0.5em;
        font-family: var(--font-mono);
        font-size: 0.72em;
        padding: 0.15em 0;
    }
    .i-name { color: var(--chrome-text); }
    .i-qty { color: var(--chrome-gold); font-weight: 600; }

    .empty {
        font-family: var(--font-mono);
        font-size: 0.62em;
        font-style: italic;
        color: var(--chrome-text-dim);
        opacity: 0.5;
        margin-top: 0.2em;
    }
</style>
