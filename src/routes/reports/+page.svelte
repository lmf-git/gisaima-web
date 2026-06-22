<script>
    import { onMount } from 'svelte';
    import { game } from '$lib/stores/game.js';
    import { reports } from '$lib/stores/reports.js';
    import { apiGet } from '$lib/api.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Unit from '../../components/icons/Unit.svelte';
    import Race from '../../components/icons/Race.svelte';

    let entries = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let scope = $state('personal'); // 'personal' | 'tribe' | 'house'
    let selectedReport = $state(null);

    const worldId = $derived($game.worldKey);

    const tabs = [
        { id: 'personal', label: 'Personal' },
        { id: 'house',    label: 'House' },
        { id: 'tribe',    label: 'Tribe' },
    ];

    const counts = $derived.by(() => {
        const c = { personal: 0, house: 0, tribe: 0 };
        for (const e of entries) c[e.scope] = (c[e.scope] || 0) + 1;
        return c;
    });

    // Per-scope unread tally so each tab can flag how many new dispatches await.
    const unreadCounts = $derived.by(() => {
        const c = { personal: 0, house: 0, tribe: 0 };
        for (const e of entries) if (!e.read) c[e.scope] = (c[e.scope] || 0) + 1;
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

    function openReport(e) {
        selectedReport = e;
        if (!e.read && e._id && worldId) {
            reports.markRead(worldId, e._id);
            entries = entries.map(r => r._id === e._id ? { ...r, read: true } : r);
        }
    }

    function closeReport() { selectedReport = null; }

    function handleKeydown(ev) {
        if (ev.key === 'Escape') closeReport();
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

    function isBattle(r) {
        const t = (r?.type || '').toLowerCase();
        return t.includes('battle') || t.includes('attack') || t.includes('victory') || t.includes('defeat');
    }

    function statLabel(key) {
        const map = { meleeAtk: 'Melee Atk', rangedAtk: 'Ranged Atk', magicAtk: 'Magic Atk',
                      meleeDef: 'Melee Def', rangedDef: 'Ranged Def', magicDef: 'Magic Def' };
        return map[key] || key;
    }

    function lootEntries(loot) {
        if (!loot) return [];
        return Object.entries(loot).filter(([k, v]) => !k.startsWith('_') && v > 0);
    }

    // Collapse a flat roster into icon rows grouped by unit type (and race for
    // players), mirroring the unit listing in the tile Details panel.
    function groupRoster(roster) {
        if (!Array.isArray(roster) || roster.length === 0) return [];
        const byKey = new Map();
        for (const u of roster) {
            const type = u?.type || 'unit';
            const race = u?.race || null;
            const key = `${type}|${race || ''}`;
            const existing = byKey.get(key);
            if (existing) existing.count++;
            else byKey.set(key, { type, race, name: u?.name || type, count: 1 });
        }
        return [...byKey.values()];
    }

    function _fmt(text) {
        if (!text) return '';
        return text.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    onMount(load);
    $effect(() => { if (worldId) load(); });
</script>

<svelte:head><title>Reports — Gisaima</title></svelte:head>

<svelte:window onkeydown={handleKeydown} />

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
                {#if unreadCounts[t.id]}
                    <span class="badge unread-badge" title="{unreadCounts[t.id]} unread">{unreadCounts[t.id]}</span>
                {:else if counts[t.id]}
                    <span class="badge">{counts[t.id]}</span>
                {/if}
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
                <li class:unread={!e.read}>
                    <div class="ic">
                        <Stamp kind={glyphForType(e.type)} size={20} />
                        {#if !e.read}<span class="unread-dot" aria-hidden="true"></span>{/if}
                    </div>
                    <button class="card" onclick={() => openReport(e)}>
                        <div class="card-head">
                            <span class="kind">{(e.type || 'report').replace(/_/g, ' ').toUpperCase()}</span>
                            <span class="head-right">
                                {#if !e.read}<span class="new-pill">New</span>{/if}
                                <span class="time">{timeLabel(e.timestamp || e.createdAt)}</span>
                            </span>
                        </div>
                        <h3>{e.title || e.summary || 'A report.'}</h3>
                        {#if e.summary && e.title}
                            <p class="body">{e.summary}</p>
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

{#if selectedReport}
    <div class="overlay" role="dialog" aria-modal="true" aria-label="Report detail">
        <div class="modal">
            <div class="modal-head">
                <div>
                    <span class="modal-kind">{(selectedReport.type || 'report').replace(/_/g, ' ').toUpperCase()}</span>
                    <h2>{selectedReport.title || 'Report'}</h2>
                </div>
                <button class="close-btn" onclick={closeReport} aria-label="Close">✕</button>
            </div>

            <div class="modal-body">
                {#if selectedReport.summary}
                    <p class="modal-summary">{selectedReport.summary}</p>
                {/if}

                <div class="modal-meta-row">
                    {#if selectedReport.location?.x !== undefined}
                        <span class="modal-meta"><Stamp kind="compass" size={12} /> {selectedReport.location.x}, {selectedReport.location.y}</span>
                    {/if}
                    {#if selectedReport.rounds != null}
                        <span class="modal-meta"><Stamp kind="hourglass" size={12} /> {selectedReport.rounds} round{selectedReport.rounds !== 1 ? 's' : ''}</span>
                    {/if}
                    <span class="modal-meta time">{timeLabel(selectedReport.timestamp || selectedReport.createdAt)}</span>
                </div>

                {#if isBattle(selectedReport) && (selectedReport.friendlyStats || selectedReport.enemyStats)}
                    <div class="stats-section">
                        <h4>Combat Statistics</h4>
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th class="friendly-col">{selectedReport.type === 'battle_victory' ? selectedReport.winnerName || 'Your side' : selectedReport.loserName || 'Your side'}</th>
                                    <th class="enemy-col">{selectedReport.type === 'battle_victory' ? selectedReport.loserName || 'Enemy' : selectedReport.winnerName || 'Enemy'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each ['meleeAtk','rangedAtk','magicAtk','meleeDef','rangedDef','magicDef'] as stat}
                                    {@const fv = selectedReport.friendlyStats?.[stat] ?? 0}
                                    {@const ev = selectedReport.enemyStats?.[stat] ?? 0}
                                    {#if fv > 0 || ev > 0}
                                        <tr>
                                            <td class="stat-label">{statLabel(stat)}</td>
                                            <td class="friendly-col" class:stronger={fv > ev}>{fv}</td>
                                            <td class="enemy-col" class:stronger={ev > fv}>{ev}</td>
                                        </tr>
                                    {/if}
                                {/each}
                                {#if (selectedReport.friendlyStats?.unitCount ?? 0) > 0 || (selectedReport.enemyStats?.unitCount ?? 0) > 0}
                                    <tr class="unit-row">
                                        <td class="stat-label">Units</td>
                                        <td class="friendly-col">{selectedReport.friendlyStats?.unitCount ?? '—'}</td>
                                        <td class="enemy-col">{selectedReport.enemyStats?.unitCount ?? '—'}</td>
                                    </tr>
                                {/if}
                            </tbody>
                        </table>
                    </div>
                {/if}

                {#if isBattle(selectedReport)}
                    <div class="casualties-section">
                        <h4>Casualties</h4>
                        <div class="casualties-row">
                            <div class="casualty-block friendly">
                                <span class="casualty-label">Friendly</span>
                                <span class="casualty-num">{selectedReport.friendlyCasualties ?? '—'}</span>
                            </div>
                            <div class="casualty-block enemy">
                                <span class="casualty-label">Enemy</span>
                                <span class="casualty-num">{selectedReport.enemyCasualties ?? '—'}</span>
                            </div>
                        </div>
                    </div>
                {/if}

                {#if isBattle(selectedReport) && (selectedReport.friendlyRoster?.length || selectedReport.enemyRoster?.length)}
                    <div class="forces-section">
                        <h4>Forces</h4>
                        <div class="forces-grid">
                            <div class="force-col">
                                <span class="force-side-label">{selectedReport.type === 'battle_victory' ? (selectedReport.winnerName || 'Your side') : (selectedReport.loserName || 'Your side')}</span>
                                {#each groupRoster(selectedReport.friendlyRoster) as u}
                                    <div class="force-unit">
                                        <span class="force-unit-icon">
                                            {#if u.type === 'player'}
                                                <Race raceKey={u.race} extraClass="report-unit-icon" />
                                            {:else}
                                                <Unit unitIconKey={u.type} extraClass="report-unit-icon" />
                                            {/if}
                                        </span>
                                        <span class="force-unit-name">{u.name || _fmt(u.type)}</span>
                                        {#if u.count > 1}<span class="force-unit-count">×{u.count}</span>{/if}
                                    </div>
                                {/each}
                            </div>
                            <div class="force-col enemy">
                                <span class="force-side-label">{selectedReport.type === 'battle_victory' ? (selectedReport.loserName || 'Enemy') : (selectedReport.winnerName || 'Enemy')}</span>
                                {#each groupRoster(selectedReport.enemyRoster) as u}
                                    <div class="force-unit">
                                        <span class="force-unit-icon">
                                            {#if u.type === 'player'}
                                                <Race raceKey={u.race} extraClass="report-unit-icon" />
                                            {:else}
                                                <Unit unitIconKey={u.type} extraClass="report-unit-icon" />
                                            {/if}
                                        </span>
                                        <span class="force-unit-name">{u.name || _fmt(u.type)}</span>
                                        {#if u.count > 1}<span class="force-unit-count">×{u.count}</span>{/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                {#if lootEntries(selectedReport.loot).length > 0}
                    <div class="loot-section">
                        <h4>{selectedReport.type === 'battle_victory' ? 'Items Captured' : 'Items Lost'}</h4>
                        <ul class="loot-list">
                            {#each lootEntries(selectedReport.loot) as [item, qty]}
                                <li><span class="loot-qty">{qty}</span> <span class="loot-item">{item}</span></li>
                            {/each}
                        </ul>
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
        background: rgba(26, 32, 48, 0.18); color: var(--color-ink-700);
        border-radius: 1em; padding: 0.05em 0.5em; min-width: 1.4em; text-align: center;
    }

    .list { list-style: none; padding: 0; margin: 1.5em 0 0; display: grid; gap: 0.8em; }
    .list li { display: grid; grid-template-columns: 40px 1fr; gap: 1em; align-items: start; }
    .ic { display: flex; align-items: center; justify-content: center; color: var(--color-wax-red); padding-top: 0.6em; }

    .card {
        background: var(--color-parchment-100); border: 1px solid rgba(26, 32, 48, 0.2);
        padding: 1em 1.2em; cursor: pointer; width: 100%; text-align: left;
        transition: background-color 0.15s, border-color 0.15s; font-family: inherit;
    }
    .card:hover { background: var(--color-parchment-200); border-color: rgba(176, 141, 74, 0.4); }
    .list li.unread .card {
        border-left: 3px solid var(--color-wax-red);
        background: rgba(139, 32, 32, 0.05);
    }
    .list li.unread .card h3 { font-weight: 700; }

    /* Unread affordances: a wax dot on the stamp + a "New" pill in the head. */
    .ic { position: relative; }
    .unread-dot {
        position: absolute; top: 0.35em; right: -0.1em;
        width: 0.55em; height: 0.55em; border-radius: 50%;
        background: var(--color-wax-red);
        box-shadow: 0 0 0 2px var(--color-parchment-100);
    }
    .head-right { display: inline-flex; align-items: center; gap: 0.6em; }
    .new-pill {
        font-family: var(--font-mono); font-size: 0.6rem; font-weight: 700;
        letter-spacing: 0.1em; text-transform: uppercase;
        background: var(--color-wax-red); color: var(--color-parchment-100);
        border-radius: 1em; padding: 0.1em 0.55em;
    }
    .unread-badge { background: var(--color-wax-red); color: var(--color-parchment-100); }

    .card-head { display: flex; justify-content: space-between; align-items: baseline; font-family: var(--font-mono); font-size: 0.72rem; color: var(--color-ink-500); }
    .card-head .kind { color: var(--color-wax-red); letter-spacing: 0.16em; }
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
        max-width: 640px; width: 100%; max-height: 85vh; display: flex; flex-direction: column;
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
    .modal-head h2 {
        font-family: var(--font-display); font-size: 1.3rem; margin: 0; letter-spacing: 0.04em; color: var(--color-ink-900);
    }
    .close-btn {
        background: none; border: none; cursor: pointer; font-size: 1rem;
        color: var(--color-ink-500); padding: 0.2em 0.4em; flex-shrink: 0;
    }
    .close-btn:hover { color: var(--color-ink-900); }

    .modal-body { padding: 1.2em 1.4em; overflow-y: auto; display: flex; flex-direction: column; gap: 1.2em; }

    .modal-summary {
        font-family: var(--font-body); color: var(--color-ink-700); margin: 0; line-height: 1.55;
    }

    .modal-meta-row { display: flex; flex-wrap: wrap; gap: 1em; }
    .modal-meta {
        display: inline-flex; align-items: center; gap: 0.4em;
        font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500);
    }

    h4 {
        font-family: var(--font-display); font-size: 0.75rem; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--color-aged-gold); margin: 0 0 0.6em;
    }

    .stats-table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.82rem; }
    .stats-table th, .stats-table td { padding: 0.4em 0.6em; border-bottom: 1px solid rgba(26,32,48,0.1); }
    .stats-table th { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-ink-500); text-align: right; }
    .stats-table th:first-child { text-align: left; }
    .stat-label { color: var(--color-ink-700); }
    .friendly-col { text-align: right; color: var(--color-ink-900); }
    .enemy-col { text-align: right; color: var(--color-ink-700); }
    .stronger { font-weight: 700; color: var(--color-aged-gold); }
    .unit-row td { border-top: 1px solid rgba(26,32,48,0.15); font-weight: 600; }

    .casualties-row { display: flex; gap: 1em; }
    .casualty-block {
        flex: 1; padding: 0.7em 1em; border: 1px solid rgba(26,32,48,0.15);
        display: flex; flex-direction: column; align-items: center; gap: 0.2em;
    }
    .casualty-block.enemy { border-color: rgba(91, 26, 31, 0.3); background: rgba(91, 26, 31, 0.04); }
    .casualty-label { font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-ink-500); }
    .casualty-num { font-family: var(--font-display); font-size: 1.6rem; color: var(--color-ink-900); }
    .casualty-block.enemy .casualty-num { color: var(--color-wax-red); }

    /* ── Forces (unit rosters with icons) ── */
    .forces-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1em; }
    .force-col { display: flex; flex-direction: column; gap: 0.4em; }
    .force-side-label {
        font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 0.12em;
        text-transform: uppercase; color: var(--color-ink-500); margin-bottom: 0.2em;
    }
    .force-col.enemy .force-side-label { color: var(--color-wax-red); }
    .force-unit { display: flex; align-items: center; gap: 0.5em; font-family: var(--font-body); font-size: 0.86rem; }
    .force-unit-icon { display: inline-flex; align-items: center; color: var(--color-aged-gold); flex-shrink: 0; }
    :global(.report-unit-icon) { width: 1.3em; height: 1.3em; }
    .force-unit-name { color: var(--color-ink-700); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .force-unit-count { font-family: var(--font-mono); font-size: 0.78rem; color: var(--color-ink-500); margin-left: auto; }

    .loot-list { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 0.5em; }
    .loot-list li {
        background: rgba(176, 141, 74, 0.1); border: 1px solid rgba(176, 141, 74, 0.3);
        padding: 0.3em 0.7em; font-family: var(--font-mono); font-size: 0.82rem;
        display: flex; align-items: center; gap: 0.4em;
    }
    .loot-qty { font-weight: 700; color: var(--color-aged-gold); }
    .loot-item { color: var(--color-ink-700); text-transform: capitalize; }

    @media (max-width: 600px) {
        .page { padding: 6em 1.2em 3em; }
        h1 { font-size: 1.9rem; }
        .list li { grid-template-columns: 30px 1fr; gap: 0.7em; }
        .modal { max-height: 92vh; }
        .casualties-row { flex-direction: column; }
    }
</style>
