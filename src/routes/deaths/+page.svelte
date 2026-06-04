<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';

    let items = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/death-feed`);
            items = r?.items || [];
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function ageOf(life) {
        if (!life.died || !life.born) return '—';
        const ms = new Date(life.died).getTime() - new Date(life.born).getTime();
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        if (days >= 1) return `${days}d`;
        const hours = Math.floor(ms / (1000 * 60 * 60));
        return `${hours}h`;
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Death Feed — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">In Memoriam</div>
    <h1>The Fallen</h1>
    <p class="lede">No one walks the realm forever. Here lie the records of those who have.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Turning the death roll…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world.</p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if !items.length}
        <p class="empty italic">The realm has yet to take a life.</p>
    {:else}
        <ul class="list">
            {#each items as l}
                <li>
                    <WaxSeal glyph="skull" color="#2d3548" size={42} />
                    <div>
                        <div class="name">{l.name}</div>
                        <div class="meta">
                            born {new Date(l.born).toLocaleDateString()} · lived {ageOf(l)}
                            {#if l.cause}· cause: <em>{l.cause}</em>{/if}
                            {#if l.by}· by {l.by.slice(0, 8)}{/if}
                        </div>
                        <div class="deeds"><Stamp kind="scroll" size={11} /> {l.deeds || 0} deeds</div>
                    </div>
                    <span class="when">{new Date(l.died).toLocaleString()}</span>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .list { list-style: none; padding: 0; margin: 1em 0 0; display: grid; gap: 0.6em; }
    .list li { display: grid; grid-template-columns: 50px 1fr auto; gap: 1em; align-items: center; background: var(--color-parchment-100); border: 1px solid rgba(26,32,48,.2); padding: 0.9em 1.1em; }
    .name { font-family: var(--font-display); font-size: 1.05rem; letter-spacing: 0.04em; }
    .meta { font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); margin: 0.2em 0; }
    .meta em { color: var(--color-wax-red); }
    .deeds { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-700); display: inline-flex; align-items: center; gap: 0.4em; }
    .when { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); }
</style>
