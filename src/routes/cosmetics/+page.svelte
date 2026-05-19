<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiGet, apiPost } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    let catalog = $state([]);
    let owned = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/cosmetics`);
            catalog = r?.catalog || [];
            owned = r?.owned || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function buy(key) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/cosmetics`, { key });
            await load();
        } catch (e) {
            alert(`Purchase failed: ${e.message}`);
        }
    }

    async function equip(slot, key) {
        try {
            await apiPost(`/worlds/${encodeURIComponent(worldId)}/cosmetics/equip`, { slot, key });
            await load();
        } catch (e) {
            alert(`Equip failed: ${e.message}`);
        }
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Aesthetics — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">Honours & Adornments</div>
    <h1>Aesthetics</h1>
    <p class="lede">Wealth, worn. Bought with in-realm gold — never with coin from the world outside.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Reading the wardrobe…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world.</p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        <div class="grid">
            {#each catalog as c}
                {@const isOwned = owned.includes(c.key)}
                <div class="card" class:owned={isOwned}>
                    <div class="icon"><Stamp kind={c.glyph} size={36} /></div>
                    <div class="name">{c.name}</div>
                    <div class="slot">{c.slot.toUpperCase()}</div>
                    <div class="price">
                        {#if isOwned}
                            <span class="owned-tag">OWNED</span>
                        {:else}
                            <Stamp kind="coin" size={12} /> {c.price.toLocaleString()}
                        {/if}
                    </div>
                    <div class="acts">
                        {#if isOwned}
                            <button class="equip" onclick={() => equip(c.slot, c.key)}>Equip</button>
                        {:else}
                            <button class="buy" onclick={() => buy(c.key)}>Buy</button>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1em; margin-top: 2em; }
    .card { background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 1.2em 1em 1em; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.5em; }
    .card.owned { border-color: var(--color-aged-gold); background: linear-gradient(180deg, var(--color-parchment-100), var(--color-parchment-200)); }
    .icon { color: var(--color-ink-700); }
    .name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .slot { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.2em; color: var(--color-ink-500); }
    .price { font-family: var(--font-mono); color: var(--color-aged-gold); display: inline-flex; align-items: center; gap: 0.4em; }
    .owned-tag { color: var(--color-sage-deep); font-family: var(--font-display); font-size: 0.72rem; letter-spacing: 0.18em; }
    .acts button { width: 100%; margin-top: 0.4em; padding: 0.5em; font-family: var(--font-display); font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; border: 1px solid var(--color-ink-900); background: var(--color-ink-900); color: var(--color-parchment-100); }
    .acts .equip { background: transparent; color: var(--color-ink-900); }
</style>
