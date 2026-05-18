<script>
    import { derived } from 'svelte/store';
    import { entities, currentPlayerPosition } from '$lib/stores/map.js';
    import { user } from '$lib/stores/user.js';
    import Stamp from '../../ui/Stamp.svelte';

    // Top resource strip — shows the four primary resources visible at the
    // player's current location's sink (their group or structure on the tile).
    // Aligns to the reference HudA top bar.
    const totals = derived(
        [entities, currentPlayerPosition, user],
        ([$ent, $pos, $user]) => {
            if (!$pos || !$user) return null;
            const key = `${$pos.x},${$pos.y}`;
            const struct = $ent.structure?.[key];
            const groups = $ent.groups?.[key] || [];

            // Prefer the player's own group's items, otherwise the structure
            // if they own it, otherwise the structure they're standing on (read-only).
            const myGroup = groups.find((g) => g?.owner === $user.uid);
            let items = null;
            if (myGroup?.items) items = myGroup.items;
            else if (struct) items = struct.items || {};

            if (!items) return null;
            return {
                gold:  Number(items.GOLD || items.COINS || 0),
                wheat: Number(items.WHEAT || items.GRAIN || 0),
                wood:  Number(items.WOOD || items.WOODEN_STICKS || items.LOG || 0),
                stone: Number(items.STONE || items.STONE_PIECES || items.IRON_ORE || 0),
                source: myGroup?.items ? 'group' : 'structure'
            };
        }
    );

    function fmt(n) {
        if (n == null) return '—';
        return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
    }
</script>

{#if $totals}
    <div class="bar">
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
        <div class="source">@ {$totals.source}</div>
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
        pointer-events: none;
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
    .source {
        display: inline-flex;
        align-items: center;
        padding: 0 0.85em;
        border-left: 0.075em solid rgba(176, 141, 74, 0.18);
        font-family: var(--font-display);
        font-size: 0.62em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(232, 228, 210, 0.5);
    }

    @media (max-width: 900px) {
        .bar { left: 8px; top: 60px; }
        .lbl, .source { display: none; }
        .cell { padding: 0.35em 0.6em; }
    }
</style>
