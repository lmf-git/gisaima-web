<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';

    let entries = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/reports`);
            entries = Array.isArray(r) ? r : (r?.reports || r?.items || []);
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function timeLabel(d) {
        if (!d) return '—';
        const t = typeof d === 'number' ? d : new Date(d).getTime();
        const s = Math.floor((Date.now() - t) / 1000);
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)}m ago`;
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
        return `${Math.floor(s / 86400)}d ago`;
    }

    function glyphForKind(k) {
        if (!k) return 'scroll';
        const s = k.toLowerCase();
        if (s.includes('battle') || s.includes('attack')) return 'crossed-swords';
        if (s.includes('build')) return 'hammer';
        if (s.includes('gather') || s.includes('craft')) return 'wheat';
        if (s.includes('move') || s.includes('travel')) return 'compass';
        if (s.includes('death') || s.includes('kill')) return 'skull';
        return 'scroll';
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Chronicle — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Long Memory</div>
    <h1>The Chronicle</h1>
    <p class="lede">Every realm keeps a book. Battles, foundings, betrayals — all are recorded by the Cartographers.</p>
    <Flourish extraClass="page-flourish" />

    {#if loading}
        <p class="empty italic">Turning the pages…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if entries.length === 0}
        <p class="empty italic">The book is open, but the ink is dry. No events yet.</p>
    {:else}
        <ol class="timeline">
            {#each entries as e}
                <li>
                    <div class="seal-col">
                        <WaxSeal glyph={glyphForKind(e.kind || e.type)} color="#5b1a1f" size={42} />
                    </div>
                    <div class="card">
                        <div class="card-head">
                            <span class="kind">{(e.kind || e.type || 'event').toUpperCase()}</span>
                            <span class="time">{timeLabel(e.timestamp || e.createdAt || e.t)}</span>
                        </div>
                        <h3>{e.title || e.summary || 'An event was recorded.'}</h3>
                        {#if e.body || e.text}
                            <p class="body">{e.body || e.text}</p>
                        {/if}
                        {#if e.location?.x !== undefined}
                            <div class="meta"><Stamp kind="compass" size={11} /> {e.location.x}, {e.location.y}</div>
                        {/if}
                    </div>
                </li>
            {/each}
        </ol>
    {/if}
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 900px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .timeline { list-style: none; padding: 0; margin: 2em 0 0; display: grid; gap: 1em; }
    .timeline li { display: grid; grid-template-columns: 50px 1fr; gap: 1em; }
    .card { background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); padding: 1em 1.2em; }
    .card-head { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .card-head .kind { color: var(--color-wax-red); letter-spacing: 0.18em; }
    .card h3 { font-family: var(--font-display); font-size: 1.05rem; margin: 0.4em 0 0.3em; letter-spacing: 0.04em; }
    .body { font-family: var(--font-body); margin: 0; color: var(--color-ink-700); }
    .meta { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); margin-top: 0.5em; }
</style>
