<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    let data = $state(null);
    let loading = $state(true);
    let error = $state(null);
    let tab = $state('points');

    const tabs = [
        { id: 'points',     label: 'Power' },
        { id: 'kills',      label: 'Bloodied' },
        { id: 'structures', label: 'Holdings' }
    ];

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            data = await apiGet(`/worlds/${encodeURIComponent(worldId)}/rankings`);
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function valueFor(row) {
        if (tab === 'points')     return row.structurePoints;
        if (tab === 'kills')      return row.kills;
        if (tab === 'structures') return row.structureCount;
        return 0;
    }

    function sealColor(rank) {
        if (rank === 1) return '#5b1a1f';
        if (rank <= 5) return '#16393f';
        return '#3f5a4e';
    }

    const rows = $derived(data ? data[tab] || [] : []);
    const tribeRows = $derived(data ? data[tab === 'points' ? 'tribePoints' : tab === 'kills' ? 'tribeKills' : 'tribeStructures'] || [] : []);
    const houseRows = $derived(data ? data[tab === 'points' ? 'housePoints' : tab === 'kills' ? 'houseKills' : 'houseStructures'] || [] : []);

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Standings — Gisaima</title></svelte:head>

<div class="page">
    <header class="hero">
        <div class="eyebrow wax">The Roll</div>
        <h1>Standings of the Realm</h1>
        <p class="lede">Power, blood, and ground. The Chronicle keeps account.</p>
        <Flourish extraClass="page-flourish" />
    </header>

    <nav class="tabs">
        {#each tabs as t}
            <button class:active={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
        {/each}
    </nav>

    {#if loading}
        <p class="empty italic">Counting the realm…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else}
        <div class="grid">
            <section>
                <div class="eyebrow">Players</div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Player</th>
                            <th class="num">{tabs.find(x => x.id === tab).label}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each rows as r, i}
                            <tr>
                                <td class="rank">
                                    {#if i < 3}<WaxSeal label={String(i + 1)} color={sealColor(i + 1)} size={28} />{:else}{i + 1}{/if}
                                </td>
                                <td class="house">{r.displayName}</td>
                                <td class="num">{valueFor(r).toLocaleString()}</td>
                            </tr>
                        {/each}
                        {#if rows.length === 0}
                            <tr><td colspan="3" class="empty-cell italic">No standings yet.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </section>

            <section>
                <div class="eyebrow">Houses</div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>House</th>
                            <th class="num">{tabs.find(x => x.id === tab).label}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each houseRows as r, i}
                            <tr>
                                <td class="rank">
                                    {#if i < 3}<WaxSeal label={String(i + 1)} color={sealColor(i + 1)} size={28} />{:else}{i + 1}{/if}
                                </td>
                                <td class="house">{r.name}</td>
                                <td class="num">{valueFor(r).toLocaleString()}</td>
                            </tr>
                        {/each}
                        {#if houseRows.length === 0}
                            <tr><td colspan="3" class="empty-cell italic">No houses sworn.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </section>

            <section>
                <div class="eyebrow">Tribes</div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tribe</th>
                            <th class="num">{tabs.find(x => x.id === tab).label}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each tribeRows as r, i}
                            <tr>
                                <td class="rank">{i + 1}</td>
                                <td class="house"><span class="tag">[{r.tag}]</span> {r.name}</td>
                                <td class="num">{valueFor(r).toLocaleString()}</td>
                            </tr>
                        {/each}
                        {#if tribeRows.length === 0}
                            <tr><td colspan="3" class="empty-cell italic">No tribes formed.</td></tr>
                        {/if}
                    </tbody>
                </table>
            </section>
        </div>
    {/if}
</div>

<style>
    .page {
        position: relative;
        z-index: 2;
        max-width: 1100px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero h1 {
        font-family: var(--font-display);
        font-size: 2.8rem;
        margin: 0.3em 0;
        letter-spacing: 0.04em;
    }
    .lede {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        max-width: 600px;
        margin: 0 0 1em;
    }
    .tabs { display: flex; gap: 0; margin: 2em 0 1em; border-bottom: 1px solid var(--color-ink-900); }
    .tabs button {
        font-family: var(--font-display);
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        padding: 0.8em 1.4em;
        background: transparent;
        border: none;
        color: var(--color-ink-500);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
    }
    .tabs button.active {
        color: var(--color-wax-red);
        border-bottom-color: var(--color-wax-red);
    }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2em; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-body); font-size: 0.95rem; }
    thead th {
        text-align: left;
        font-family: var(--font-display);
        font-size: 10px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        padding: 0.6em 0.4em;
        border-bottom: 1px solid var(--color-ink-900);
    }
    th.num, td.num { text-align: right; font-family: var(--font-mono); font-size: 0.85rem; }
    td { padding: 0.6em 0.4em; border-bottom: 1px solid rgba(26, 32, 48, 0.15); }
    td.rank { width: 40px; font-family: var(--font-mono); color: var(--color-ink-500); }
    td.house { font-family: var(--font-display); font-size: 0.9rem; letter-spacing: 0.04em; }
    .tag { color: var(--color-wax-red); font-family: var(--font-mono); font-size: 0.75rem; }
    .empty-cell, .empty { font-family: var(--font-editorial); color: var(--color-ink-500); text-align: center; padding: 2em; }
    .err { color: var(--color-wax-red); }
    .italic { font-style: italic; }
    @media (max-width: 1000px) {
        .grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
        .grid { grid-template-columns: 1fr; }
    }
</style>
