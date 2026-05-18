<script>
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { currentPlayerPosition, entities } from '$lib/stores/map.js';
    import { apiPost } from '$lib/api.js';
    import Stamp from '../../ui/Stamp.svelte';

    let busy = $state(false);
    let expanded = $state(false);
    let dropDraft = $state({ key: 'GOLD', qty: 1 });

    const worldId = $derived($game.worldKey);
    const pos = $derived($currentPlayerPosition);
    const tileKey = $derived(pos ? `${pos.x},${pos.y}` : null);

    // Items at the player's current tile — read live from the entities store
    // (populated by chunk_update WebSocket events + initial chunk fetch).
    // The map store normalises `tile.items` into `entities.items[tileKey]`.
    const tileItems = $derived.by(() => {
        if (!tileKey) return {};
        const raw = $entities.items?.[tileKey];
        if (!raw) return {};
        // entities.items entries may be array (legacy) or object (current).
        if (Array.isArray(raw)) {
            const obj = {};
            for (const it of raw) {
                const k = (it?.code || it?.id || it?.name || '').toString();
                if (!k || k.startsWith('_')) continue;
                obj[k.toUpperCase()] = (obj[k.toUpperCase()] || 0) + (Number(it?.quantity) || 1);
            }
            return obj;
        }
        // strip metadata keys (_x, _y, ...) from the items object.
        return Object.fromEntries(
            Object.entries(raw).filter(([k]) => k && !k.startsWith('_'))
        );
    });

    // The sink items available to drop — the player's own group at this tile,
    // or the structure they own there. Reuses the same resolution rules as
    // the API's rewards.js.
    const sinkItems = $derived.by(() => {
        if (!pos || !$user) return null;
        const key = `${pos.x},${pos.y}`;
        const groups = $entities.groups?.[key] || [];
        const struct = $entities.structure?.[key];
        const mine = groups.find((g) => g?.owner === $user.uid);
        if (mine?.items && Object.keys(mine.items).length) return mine.items;
        if (struct?.owner === $user.uid && struct.items) return struct.items;
        return null;
    });

    async function pickup(item, qty) {
        if (!worldId) return;
        busy = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/items/pickup`, {
                items: { [item]: qty }
            });
            // No manual refresh — the chunk_update WS broadcast will repaint
            // entities.items[tileKey] and this view derives from it.
        } catch (e) {
            alert(`Pickup failed: ${e.message}`);
        } finally {
            busy = false;
        }
    }

    async function drop() {
        if (!worldId) return;
        const qty = Math.max(1, Math.floor(Number(dropDraft.qty) || 0));
        const key = (dropDraft.key || '').toUpperCase().trim();
        if (!key) return;
        busy = true;
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/items/drop`, {
                items: { [key]: qty }
            });
        } catch (e) {
            alert(`Drop failed: ${e.message}`);
        } finally {
            busy = false;
        }
    }

    function glyphFor(key) {
        const k = (key || '').toUpperCase();
        if (k === 'GOLD' || k.includes('COIN')) return 'coin';
        if (k.includes('WOOD') || k.includes('STICK')) return 'wood';
        if (k.includes('STONE') || k.includes('IRON') || k.includes('ORE') || k.includes('CRYSTAL')) return 'stone';
        if (k.includes('WHEAT') || k.includes('GRAIN') || k.includes('BERRY') || k.includes('HERB')) return 'wheat';
        if (k.includes('SWORD') || k.includes('WEAPON')) return 'sword';
        if (k.includes('SHIELD') || k.includes('BODY') || k.includes('HELM')) return 'shield';
        if (k.includes('SKULL') || k.includes('BONE')) return 'skull';
        if (k.includes('SCROLL') || k.includes('FRAGMENT')) return 'scroll';
        return 'plus';
    }

    const hasDrops = $derived(Object.keys(tileItems).length > 0);
</script>

{#if pos && (hasDrops || expanded)}
    <aside class="drops" class:open={expanded}>
        <button class="toggle" type="button" onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
            <Stamp kind="scroll" size={14} />
            <span class="title">ON THIS TILE</span>
            <span class="count">{Object.keys(tileItems).length}</span>
        </button>

        {#if expanded}
            <div class="body">
                {#if !hasDrops}
                    <p class="empty italic">Nothing dropped here.</p>
                {:else}
                    <ul class="list">
                        {#each Object.entries(tileItems) as [k, q]}
                            <li>
                                <Stamp kind={glyphFor(k)} size={14} />
                                <span class="qty">×{q}</span>
                                <span class="key">{k.replace(/_/g, ' ').toLowerCase()}</span>
                                <button onclick={() => pickup(k, q)} disabled={busy || !sinkItems}>
                                    pick up
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}

                {#if sinkItems}
                    <form class="drop-form" onsubmit={(e) => { e.preventDefault(); drop(); }}>
                        <div class="form-row">
                            <select bind:value={dropDraft.key}>
                                {#each Object.entries(sinkItems) as [k, q]}
                                    <option value={k}>{k.replace(/_/g, ' ').toLowerCase()} (×{q})</option>
                                {/each}
                            </select>
                            <input type="number" min="1" max="9999" bind:value={dropDraft.qty} />
                            <button type="submit" disabled={busy}>drop</button>
                        </div>
                    </form>
                {/if}
            </div>
        {/if}
    </aside>
{/if}

<style>
    .drops {
        position: absolute;
        right: 1em;
        bottom: 7em;
        z-index: 500;
        min-width: 230px;
        max-width: 280px;
        background: rgba(14, 19, 32, 0.92);
        border: 0.075em solid rgba(176, 141, 74, 0.4);
        backdrop-filter: blur(0.5em);
        color: var(--color-parchment-200);
        font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
    }
    .toggle {
        display: flex;
        align-items: center;
        gap: 0.5em;
        padding: 0.55em 0.8em;
        cursor: pointer;
        border: none;
        border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
        background: transparent;
        color: var(--color-gold-pale);
        width: 100%;
        font-family: inherit;
        text-align: left;
    }
    .title {
        font-family: var(--font-display);
        font-size: 0.7em;
        letter-spacing: 0.18em;
        flex: 1;
    }
    .count {
        font-family: var(--font-mono);
        font-size: 0.78em;
        color: var(--color-wax-red);
        background: rgba(154, 51, 32, 0.18);
        padding: 0.1em 0.45em;
    }
    .body { padding: 0.5em 0.7em 0.7em; }
    .empty {
        padding: 0.7em 0;
        font-family: var(--font-editorial);
        color: rgba(232, 228, 210, 0.5);
        text-align: center;
        font-size: 0.82em;
    }
    .italic { font-style: italic; }
    .list { list-style: none; padding: 0; margin: 0; }
    .list li {
        display: grid;
        grid-template-columns: 16px auto 1fr auto;
        gap: 0.45em;
        align-items: center;
        padding: 0.3em 0;
        font-size: 0.82em;
    }
    .list :global(svg) { color: var(--color-gold-pale); }
    .qty { font-family: var(--font-mono); color: var(--color-parchment-100); }
    .key { font-family: var(--font-editorial); font-style: italic; color: rgba(232, 228, 210, 0.65); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .list button {
        font-family: var(--font-display);
        font-size: 0.62em;
        letter-spacing: 0.16em;
        padding: 0.3em 0.5em;
        background: transparent;
        border: 0.075em solid rgba(176, 141, 74, 0.4);
        color: var(--color-gold-pale);
        cursor: pointer;
    }
    .list button:hover:not(:disabled) {
        background: rgba(176, 141, 74, 0.16);
        border-color: var(--color-gold-pale);
    }
    .list button:disabled { opacity: 0.45; cursor: not-allowed; }
    .drop-form { margin-top: 0.6em; padding-top: 0.6em; border-top: 1px dashed rgba(176, 141, 74, 0.2); }
    .form-row { display: grid; grid-template-columns: 1fr 60px auto; gap: 0.3em; }
    .form-row select, .form-row input {
        background: rgba(14, 19, 32, 0.6);
        border: 0.075em solid rgba(176, 141, 74, 0.3);
        color: var(--color-parchment-100);
        font-family: var(--font-mono);
        font-size: 0.78em;
        padding: 0.3em 0.5em;
    }
    .form-row button {
        font-family: var(--font-display);
        font-size: 0.62em;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        background: var(--color-aged-gold);
        color: var(--color-ink-900);
        border: 0.075em solid var(--color-aged-gold);
        padding: 0.3em 0.7em;
        cursor: pointer;
    }
    .form-row button:disabled { opacity: 0.45; cursor: not-allowed; }
    @media (max-width: 700px) {
        .drops { bottom: 5em; min-width: 200px; max-width: 220px; }
    }
</style>
