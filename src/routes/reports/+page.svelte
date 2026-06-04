<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';

    let entries = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let scope = $state('personal'); // 'personal' | 'tribe' | 'house'

    const worldId = $derived($game.worldKey);

    const tabs = [
        { id: 'personal', label: 'Personal' },
        { id: 'house',    label: 'House' },
        { id: 'tribe',    label: 'Tribe' },
    ];

    // Counts per scope drive the tab badges.
    const counts = $derived.by(() => {
        const c = { personal: 0, house: 0, tribe: 0 };
        for (const e of entries) c[e.scope] = (c[e.scope] || 0) + 1;
        return c;
    });

    const visible = $derived(entries.filter(e => e.scope === scope));

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

    function glyphForType(t) {
        const s = (t || '').toLowerCase();
        if (s.includes('captur')) return 'tower';
        if (s.includes('lost')) return 'skull';
        if (s.includes('battle') || s.includes('attack')) return 'crossed-swords';
        if (s.includes('build')) return 'hammer';
        if (s.includes('death') || s.includes('kill')) return 'skull';
        return 'scroll';
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Reports — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">Dispatches</div>
    <h1>Reports</h1>
    <p class="lede">Word reaches you of events touching you, your house, and your tribe.</p>
    <Flourish extraClass="page-flourish" />

    <div class="tabs" role="tablist">
        {#each tabs as t}
            <button
                class="tab"
                class:active={scope === t.id}
                role="tab"
                aria-selected={scope === t.id}
                onclick={() => (scope = t.id)}
            >
                {t.label}
                {#if counts[t.id]}<span class="badge">{counts[t.id]}</span>{/if}
            </button>
        {/each}
    </div>

    {#if loading}
        <p class="empty italic">Reading the dispatches…</p>
    {:else if !worldId}
        <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
    {:else if error}
        <p class="empty err">{error}</p>
    {:else if visible.length === 0}
        <p class="empty italic">
            {#if scope === 'house'}No house dispatches yet.
            {:else if scope === 'tribe'}No tribe dispatches yet.
            {:else}No personal reports yet.{/if}
        </p>
    {:else}
        <ol class="list">
            {#each visible as e}
                <li class:unread={e.read === false}>
                    <div class="ic"><Stamp kind={glyphForType(e.type)} size={20} /></div>
                    <div class="card">
                        <div class="card-head">
                            <span class="kind">{(e.type || 'report').replace(/_/g, ' ').toUpperCase()}</span>
                            <span class="time">{timeLabel(e.timestamp || e.createdAt)}</span>
                        </div>
                        <h3>{e.title || e.summary || 'A report.'}</h3>
                        {#if e.summary && e.title}
                            <p class="body">{e.summary}</p>
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
    .page { position: relative; z-index: 2; width: 100%; max-width: 1100px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .err { color: var(--color-wax-red); }

    .tabs { display: flex; gap: 0.4em; margin: 1.5em 0 0.5em; border-bottom: 1px solid rgba(26, 32, 48, 0.2); }
    .tab {
        background: none; border: none; cursor: pointer;
        font-family: var(--font-display); font-size: 0.8rem; letter-spacing: 0.14em; text-transform: uppercase;
        padding: 0.6em 1em; color: var(--color-ink-500);
        border-bottom: 2px solid transparent; margin-bottom: -1px;
        display: inline-flex; align-items: center; gap: 0.5em;
    }
    .tab:hover { color: var(--color-ink-900); }
    .tab.active { color: var(--color-wax-red); border-bottom-color: var(--color-wax-red); }
    .badge {
        font-family: var(--font-mono); font-size: 0.62rem; font-weight: 600;
        background: var(--color-wax-red); color: var(--color-parchment-100);
        border-radius: 1em; padding: 0.05em 0.5em; min-width: 1.4em; text-align: center;
    }

    .list { list-style: none; padding: 0; margin: 1.5em 0 0; display: grid; gap: 0.8em; }
    .list li { display: grid; grid-template-columns: 40px 1fr; gap: 1em; align-items: start; }
    .ic { display: flex; align-items: center; justify-content: center; color: var(--color-wax-red); padding-top: 0.6em; }
    .card { background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2); padding: 1em 1.2em; }
    .list li.unread .card { border-left: 3px solid var(--color-wax-red); }
    .card-head { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .card-head .kind { color: var(--color-wax-red); letter-spacing: 0.16em; }
    .card h3 { font-family: var(--font-display); font-size: 1.05rem; margin: 0.4em 0 0.3em; letter-spacing: 0.04em; }
    .body { font-family: var(--font-body); margin: 0; color: var(--color-ink-700); }
    .meta { display: inline-flex; align-items: center; gap: 0.4em; font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); margin-top: 0.5em; }

    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .list li { grid-template-columns: 30px 1fr; gap: 0.7em; }
    }
</style>
