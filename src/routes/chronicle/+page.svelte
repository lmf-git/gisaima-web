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
    let selectedEntry = $state(null);

    const worldId = $derived($game.worldKey);

    async function load() {
        if (!worldId) { loading = false; return; }
        try {
            loading = true;
            const r = await apiGet(`/worlds/${encodeURIComponent(worldId)}/chronicle`);
            entries = Array.isArray(r) ? r : (r?.entries || r?.items || []);
            error = null;
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function handleKeydown(ev) { if (ev.key === 'Escape') selectedEntry = null; }

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
        if (s.includes('capture') || s.includes('structure')) return 'hammer';
        if (s.includes('gather') || s.includes('craft')) return 'wheat';
        if (s.includes('move') || s.includes('travel')) return 'compass';
        if (s.includes('death') || s.includes('kill')) return 'skull';
        return 'scroll';
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Chronicle — Gisaima</title></svelte:head>

<svelte:window onkeydown={handleKeydown} />

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
                    <button class="card" onclick={() => (selectedEntry = e)}>
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
                    </button>
                </li>
            {/each}
        </ol>
    {/if}
</div>

{#if selectedEntry}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Chronicle entry">
        <div class="modal">
            <div class="modal-head">
                <div>
                    <span class="modal-kind">{(selectedEntry.kind || selectedEntry.type || 'event').toUpperCase()}</span>
                    <h2>{selectedEntry.title || 'Chronicle Entry'}</h2>
                </div>
                <button class="close-btn" onclick={() => (selectedEntry = null)} aria-label="Close">✕</button>
            </div>

            <div class="modal-body">
                {#if selectedEntry.body || selectedEntry.text}
                    <p class="modal-text">{selectedEntry.body || selectedEntry.text}</p>
                {/if}

                <div class="modal-meta-row">
                    {#if selectedEntry.location?.x !== undefined}
                        <span class="modal-meta"><Stamp kind="compass" size={12} /> {selectedEntry.location.x}, {selectedEntry.location.y}</span>
                    {/if}
                    <span class="modal-meta time">{timeLabel(selectedEntry.timestamp || selectedEntry.createdAt || selectedEntry.t)}</span>
                </div>

                {#if selectedEntry.meta}
                    {@const m = selectedEntry.meta}
                    <div class="meta-section">
                        <h4>Details</h4>
                        <dl class="detail-list">
                            {#if m.units != null}
                                <dt>Combatants</dt><dd>{m.units}</dd>
                            {/if}
                            {#if m.points != null}
                                <dt>Structure Points</dt><dd>{m.points}</dd>
                            {/if}
                            {#if m.wealth != null}
                                <dt>Wealth</dt><dd>{m.wealth.toLocaleString()} gold</dd>
                            {/if}
                            {#if m.capturerName}
                                <dt>Captor</dt><dd>{m.capturerName}</dd>
                            {/if}
                            {#if m.prevOwnerName}
                                <dt>Former Holder</dt><dd>{m.prevOwnerName}</dd>
                            {/if}
                            {#if m.victimName}
                                <dt>Fallen</dt><dd>{m.victimName}</dd>
                            {/if}
                            {#if m.victimPoints != null}
                                <dt>Standing</dt><dd>{m.victimPoints} points</dd>
                            {/if}
                            {#if m.killerName}
                                <dt>Slayer</dt><dd>{m.killerName}</dd>
                            {/if}
                        </dl>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .timeline li { grid-template-columns: 36px 1fr; gap: 0.7em; }
        .modal { max-height: 92vh; }
    }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }
    .timeline { list-style: none; padding: 0; margin: 2em 0 0; display: grid; gap: 1em; }
    .timeline li { display: grid; grid-template-columns: 50px 1fr; gap: 1em; }

    .card {
        background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2);
        padding: 1em 1.2em; cursor: pointer; width: 100%; text-align: left;
        transition: background-color 0.15s, border-color 0.15s; font-family: inherit;
    }
    .card:hover { background: var(--color-parchment-200); border-color: rgba(176, 141, 74, 0.4); }
    .card-head { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .card-head .kind { color: var(--color-wax-red); letter-spacing: 0.18em; }
    .card h3 { font-family: var(--font-display); font-size: 1.05rem; margin: 0.4em 0 0.3em; letter-spacing: 0.04em; color: var(--color-ink-900); }
    .body { font-family: var(--font-body); margin: 0; color: var(--color-ink-700); }
    .meta { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); margin-top: 0.5em; }

    /* ── Modal ── */
    .overlay {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(14, 19, 32, 0.65); backdrop-filter: blur(3px);
        display: flex; align-items: center; justify-content: center; padding: 1.5em;
    }
    .modal {
        background: var(--color-parchment-100); border: 1px solid rgba(176, 141, 74, 0.4);
        max-width: 560px; width: 100%; max-height: 85vh; display: flex; flex-direction: column;
        box-shadow: 0 24px 60px rgba(0,0,0,0.35);
    }
    .modal-head {
        display: flex; justify-content: space-between; align-items: flex-start;
        padding: 1.2em 1.4em 0.8em; border-bottom: 1px solid rgba(26, 32, 48, 0.15);
    }
    .modal-kind {
        font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.2em;
        color: var(--color-wax-red); display: block; margin-bottom: 0.3em;
    }
    .modal-head h2 { font-family: var(--font-display); font-size: 1.3rem; margin: 0; letter-spacing: 0.04em; color: var(--color-ink-900); }
    .close-btn { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--color-ink-500); padding: 0.2em 0.4em; flex-shrink: 0; }
    .close-btn:hover { color: var(--color-ink-900); }

    .modal-body { padding: 1.2em 1.4em; overflow-y: auto; display: flex; flex-direction: column; gap: 1em; }
    .modal-text { font-family: var(--font-body); color: var(--color-ink-700); margin: 0; line-height: 1.55; }

    .modal-meta-row { display: flex; flex-wrap: wrap; gap: 1em; }
    .modal-meta { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); }

    h4 { font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-aged-gold); margin: 0 0 0.6em; }

    .detail-list { display: grid; grid-template-columns: auto 1fr; gap: 0.3em 1em; margin: 0; font-size: 0.88rem; }
    dt { font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-ink-500); align-self: baseline; padding-top: 0.1em; }
    dd { font-family: var(--font-body); color: var(--color-ink-900); margin: 0; }
</style>
