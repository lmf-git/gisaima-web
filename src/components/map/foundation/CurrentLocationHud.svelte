<script>
    import { derived } from 'svelte/store';
    import { entities, currentPlayerPosition } from '$lib/stores/map.js';
    import { user } from '$lib/stores/user.js';
    import Stamp from '../../ui/Stamp.svelte';

    // Resolve the items at the player's current tile.
    //  - prefer items inside the player's own group on that tile
    //  - else the structure the player owns or is a member of
    //  - else the structure (read-only view if player isn't owner)
    const place = derived(
        [entities, currentPlayerPosition, user],
        ([$ent, $pos, $user]) => {
            if (!$pos || !$user) return null;
            const key = `${$pos.x},${$pos.y}`;
            const struct = $ent.structure?.[key] || null;
            const groups = $ent.groups?.[key] || [];

            const myGroup = groups.find((g) => g?.owner === $user.uid);
            if (myGroup?.items && Object.keys(myGroup.items).length) {
                return { kind: 'group', name: myGroup.name || 'Your host', items: myGroup.items, owned: true };
            }
            if (struct) {
                const owned = struct.owner === $user.uid || (struct.members || []).includes($user.uid);
                return { kind: 'structure', name: struct.name || 'Settlement', items: struct.items || {}, owned };
            }
            if (myGroup) {
                return { kind: 'group', name: myGroup.name || 'Your host', items: myGroup.items || {}, owned: true };
            }
            return null;
        }
    );

    function glyphFor(key) {
        const k = (key || '').toUpperCase();
        if (k === 'GOLD' || k.includes('COIN')) return 'coin';
        if (k.includes('WOOD') || k.includes('STICK')) return 'wood';
        if (k.includes('STONE') || k.includes('IRON') || k.includes('ORE')) return 'stone';
        if (k.includes('WHEAT') || k.includes('GRAIN') || k.includes('BERRY') || k.includes('HERB')) return 'wheat';
        if (k.includes('SWORD') || k.includes('WEAPON')) return 'sword';
        if (k.includes('SHIELD') || k.includes('BODY') || k.includes('HELM')) return 'shield';
        if (k.includes('SCROLL') || k.includes('FRAGMENT')) return 'scroll';
        if (k.includes('BONE') || k.includes('SKULL')) return 'skull';
        if (k.includes('CRYSTAL') || k.includes('ARTIFACT')) return 'star';
        if (k.includes('FEATHER') || k.includes('RAVEN')) return 'raven';
        if (k.includes('BANNER') || k.includes('CREST')) return 'banner';
        return 'plus';
    }

    function entries(items) {
        return Object.entries(items || {})
            .filter(([, q]) => q && q > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);
    }
</script>

{#if $place}
    <aside class="hud">
        <header>
            <Stamp kind={$place.kind === 'structure' ? 'tower' : 'banner'} size={14} />
            <div class="name">{$place.name}</div>
            <div class="kind">{$place.kind === 'structure' ? 'STRUCTURE' : 'GROUP'}</div>
            {#if !$place.owned}<span class="ro">read-only</span>{/if}
        </header>
        {#if entries($place.items).length === 0}
            <div class="empty">— empty —</div>
        {:else}
            <ul class="items">
                {#each entries($place.items) as [k, q]}
                    <li>
                        <Stamp kind={glyphFor(k)} size={14} />
                        <span class="qty">{q.toLocaleString()}</span>
                        <span class="k">{k.replace(/_/g, ' ').toLowerCase()}</span>
                    </li>
                {/each}
            </ul>
        {/if}
    </aside>
{/if}

<style>
    .hud {
        position: absolute;
        left: 1em;
        bottom: 7em;
        z-index: 500;
        min-width: 220px;
        max-width: 260px;
        background: rgba(14, 19, 32, 0.92);
        border: 0.075em solid rgba(176, 141, 74, 0.4);
        backdrop-filter: blur(0.5em);
        color: var(--color-parchment-200);
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
        pointer-events: none;
    }
    header {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.55em 0.8em;
        border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
        color: var(--color-gold-pale);
    }
    .name {
        font-family: var(--font-display);
        font-size: 0.78em;
        letter-spacing: 0.12em;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .kind {
        font-family: var(--font-mono);
        font-size: 0.6em;
        letter-spacing: 0.18em;
        color: rgba(232, 228, 210, 0.5);
    }
    .ro {
        font-family: var(--font-mono);
        font-size: 0.6em;
        letter-spacing: 0.14em;
        color: rgba(232, 228, 210, 0.5);
    }
    .empty {
        padding: 0.8em;
        font-family: var(--font-editorial);
        font-style: italic;
        color: rgba(232, 228, 210, 0.5);
        text-align: center;
        font-size: 0.85em;
    }
    .items {
        list-style: none;
        padding: 0.4em 0.6em 0.6em;
        margin: 0;
    }
    .items li {
        display: grid;
        grid-template-columns: 18px 1fr auto;
        align-items: center;
        gap: 0.5em;
        padding: 0.25em 0;
        font-size: 0.85em;
    }
    .items li :global(svg) { color: var(--color-gold-pale); }
    .qty {
        font-family: var(--font-mono);
        color: var(--color-parchment-100);
        text-align: right;
    }
    .k {
        font-family: var(--font-editorial);
        font-style: italic;
        color: rgba(232, 228, 210, 0.6);
        font-size: 0.92em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    @media (max-width: 700px) {
        .hud { bottom: 5em; min-width: 180px; max-width: 200px; }
    }
</style>
