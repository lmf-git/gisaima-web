<script>
    import { derived } from 'svelte/store';
    import { entities, currentPlayerPosition } from '$lib/stores/map.js';
    import { user } from '$lib/stores/user.js';
    import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
    import Stamp from '../../ui/Stamp.svelte';

    // Top resource strip — shows the four primary resources held *personally* at
    // the player's current location: the items in their own unit group on the
    // tile, or — if standing at a structure — their personal bank there. Shared
    // structure storage is intentionally excluded.
    const totals = derived(
        [entities, currentPlayerPosition, user],
        ([$ent, $pos, $user]) => {
            if (!$pos || !$user) return null;
            const key = `${$pos.x},${$pos.y}`;
            const struct = $ent.structure?.[key];
            const groups = $ent.groups?.[key] || [];

            // Player's own group items take priority; otherwise their personal
            // bank at the structure (never the structure's shared pool).
            const myGroup = groups.find((g) => g?.owner === $user.uid);
            let items = null;
            if (myGroup?.items) items = myGroup.items;
            else if (struct?.banks?.[$user.uid]) items = struct.banks[$user.uid];

            if (!items || !Object.keys(items).length) return null;

            // Full breakdown for the hover title — formatted item names + qty.
            const breakdown = Object.entries(items)
                .filter(([code, qty]) => code && !code.startsWith('_') && Number(qty) > 0)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .map(([code, qty]) => `${ITEMS[code]?.name || code}: ${Number(qty).toLocaleString()}`)
                .join('\n');

            return {
                gold:  Number(items.GOLD || items.COINS || 0),
                wheat: Number(items.WHEAT || items.GRAIN || 0),
                wood:  Number(items.WOOD || items.WOOD || items.LOG || 0),
                stone: Number(items.STONE || items.STONE || items.METAL_ORE || 0),
                breakdown: breakdown || 'No items'
            };
        }
    );

    function fmt(n) {
        if (n == null) return '—';
        return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
    }
</script>

{#if $totals}
    <div class="bar" title={$totals.breakdown}>
        <div class="cell">
            <Stamp kind="coin" size={14} />
            <span class="qty">{fmt($totals.gold)}</span>
            <span class="lbl">GOLD</span>
        </div>
        <div class="cell">
            <Stamp kind="wheat" size={14} />
            <span class="qty">{fmt($totals.wheat)}</span>
            <span class="lbl">WHEAT</span>
        </div>
        <div class="cell">
            <Stamp kind="wood" size={14} />
            <span class="qty">{fmt($totals.wood)}</span>
            <span class="lbl">WOOD</span>
        </div>
        <div class="cell">
            <Stamp kind="stone" size={14} />
            <span class="qty">{fmt($totals.stone)}</span>
            <span class="lbl">STONE</span>
        </div>
    </div>
{/if}

<style>
    .bar {
        position: absolute;
        top: 0.6em;
        left: 72px;
        display: inline-flex;
        align-items: stretch;
        z-index: 500;
        background: rgba(14, 19, 32, 0.85);
        border: 0.075em solid rgba(176, 141, 74, 0.4);
        font-family: var(--font-mono);
        color: var(--color-parchment-200);
        backdrop-filter: blur(0.5em);
        /* Capture hover so the breakdown title tooltip appears. The bar is a
           small strip, so this doesn't meaningfully block map dragging. */
        pointer-events: auto;
        cursor: default;
    }
    .cell {
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        padding: 0.45em 0.85em;
        border-left: 0.075em solid rgba(176, 141, 74, 0.18);
        color: var(--color-parchment-100);
    }
    .cell:first-child { border-left: none; }
    .cell :global(svg) { color: var(--color-gold-pale); }
    .qty {
        font-size: 0.9em;
        font-weight: 500;
        color: var(--color-parchment-100);
    }
    .lbl {
        font-family: var(--font-display);
        font-size: 0.6em;
        letter-spacing: 0.18em;
        opacity: 0.55;
    }
    @media (max-width: 900px) {
        .bar { left: 8px; top: 60px; }
        .lbl { display: none; }
        .cell { padding: 0.35em 0.6em; }
    }
</style>
