<script>
    import { onMount } from 'svelte';
    import { game, currentPlayer, worldInfo } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import { apiPost } from '$lib/api.js';
    import { entities, currentPlayerPosition } from '$lib/stores/map.js';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';

    let now = $state(Date.now());
    let timer;
    onMount(() => { timer = setInterval(() => (now = Date.now()), 1000); });
    $effect(() => () => clearInterval(timer));

    const worldId = $derived($game.worldKey);

    // Pull every pending event for the current player from the live chunk
    // store — moves, mobilisations, gatherings, recruitments, building, battles.
    // The map store already loads chunks the player is near; this view just
    // re-projects those into a timeline.
    const events = $derived.by(() => {
        const uid = $user?.uid;
        if (!uid) return [];
        const result = [];

        for (const [locKey, groups] of Object.entries($entities.groups || {})) {
            for (const g of groups) {
                if (g.owner !== uid) continue;
                const [x, y] = locKey.split(',').map(Number);
                if (g.status === 'moving' && g.movementPath) {
                    const end = g.movementPath[g.movementPath.length - 1];
                    const stepsLeft = g.movementPath.length - 1 - (g.pathIndex || 0);
                    result.push({
                        kind: g.type === 'caravan' ? 'CARAVAN' : 'MOVE',
                        glyph: g.type === 'caravan' ? 'coin' : 'compass',
                        col: g.type === 'caravan' ? '#b08d4a' : '#16393f',
                        who: g.name || 'Unnamed banner',
                        detail: `(${x},${y}) → (${end?.x},${end?.y})`,
                        nextAt: g.nextMoveTime || null,
                        stepsLeft,
                        groupKey: { x, y, groupId: g.id }
                    });
                } else if (g.status === 'mobilizing') {
                    result.push({
                        kind: 'MOBILIZE',
                        glyph: 'banner',
                        col: '#5b1a1f',
                        who: g.name || 'Mustering force',
                        detail: `at (${x},${y})`,
                        nextAt: g.readyAt || null,
                        groupKey: { x, y, groupId: g.id }
                    });
                } else if (g.status === 'demobilising') {
                    result.push({
                        kind: 'DEMOBILIZE',
                        glyph: 'tower',
                        col: '#3f5a4e',
                        who: g.name || 'Disbanding force',
                        detail: `at (${x},${y})`,
                        nextAt: g.readyAt || null,
                        groupKey: { x, y, groupId: g.id }
                    });
                } else if (g.status === 'gathering') {
                    result.push({
                        kind: 'GATHERING',
                        glyph: 'wheat',
                        col: '#3f5a4e',
                        who: g.name || 'Gathering party',
                        detail: `${g.gatheringBiome || 'resource'} · ${g.gatheringTicksRemaining ?? '?'} ticks left`,
                        nextAt: null,
                        groupKey: { x, y, groupId: g.id }
                    });
                } else if (g.status === 'fighting' || g.battleId) {
                    result.push({
                        kind: 'BATTLE',
                        glyph: 'crossed-swords',
                        col: '#9a3320',
                        who: g.name || 'In battle',
                        detail: `at (${x},${y})`,
                        nextAt: null,
                        forced: true,
                        groupKey: { x, y, groupId: g.id }
                    });
                }
            }
        }

        for (const [locKey, struct] of Object.entries($entities.structure || {})) {
            if (struct.owner !== uid) continue;
            const [x, y] = locKey.split(',').map(Number);
            if (struct.status === 'building') {
                result.push({
                    kind: 'BUILD',
                    glyph: 'hammer',
                    col: '#6e6353',
                    who: struct.name || 'Foundation',
                    detail: `${struct.kind || 'structure'} at (${x},${y})`,
                    nextAt: struct.buildCompletesAt || null
                });
            }
            if (struct.upgradeStartedAt) {
                result.push({
                    kind: 'UPGRADE',
                    glyph: 'star',
                    col: '#b08d4a',
                    who: struct.name || 'Structure',
                    detail: `upgrade in progress`,
                    nextAt: struct.upgradeCompletesAt || null
                });
            }
            if (struct.recruitmentQueue?.length) {
                for (const r of struct.recruitmentQueue) {
                    result.push({
                        kind: 'RECRUITMENT',
                        glyph: 'plus',
                        col: '#b08d4a',
                        who: struct.name || 'Barracks',
                        detail: `${r.quantity ?? '?'}× ${r.unitType || r.unitKey || 'recruits'}`,
                        nextAt: r.completesAt || null
                    });
                }
            }
            if (struct.craftingQueue?.length) {
                for (const c of struct.craftingQueue) {
                    result.push({
                        kind: 'CRAFTING',
                        glyph: 'hammer',
                        col: '#b08d4a',
                        who: struct.name || 'Workshop',
                        detail: `${c.recipe || c.itemKey || 'item'}`,
                        nextAt: c.completesAt || null
                    });
                }
            }
        }

        return result.sort((a, b) => (a.nextAt || Infinity) - (b.nextAt || Infinity));
    });

    function timeUntil(at) {
        if (!at) return '—';
        const s = Math.max(0, Math.floor((at - now) / 1000));
        const m = Math.floor(s / 60);
        return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
    }

    const nextTickAt = $derived.by(() => {
        const t = $worldInfo?.tickInterval || $worldInfo?.tickMs || 60_000;
        const last = $worldInfo?.lastTick ? new Date($worldInfo.lastTick).getTime() : null;
        return last ? last + t : null;
    });
    const nextTickIn = $derived(nextTickAt ? timeUntil(nextTickAt) : '—');

    async function cancelEvent(e) {
        if (e.forced) return;
        if (!e.groupKey || !worldId) return;
        // Pick the right cancel endpoint based on kind.
        const kindMap = {
            MOVE:        'cancelMovement',
            CARAVAN:     'cancelMovement',
            MOBILIZE:    'cancelMovement',
            DEMOBILIZE:  'cancelMovement',
            GATHERING:   'cancelGathering',
            RECRUITMENT: 'cancelRecruitment',
            CRAFTING:    'cancelCrafting'
        };
        const action = kindMap[e.kind];
        if (!action) return;
        try {
            await apiPost(`/actions/${action}`, {
                worldId,
                ...(e.groupKey || {})
            });
        } catch (err) {
            alert(`Cancel failed: ${err.message}`);
        }
    }
</script>

<svelte:head><title>Pending Events — Gisaima</title></svelte:head>

<div class="page">
    <header class="head">
        <div class="title">
            <div class="eyebrow wax">What will resolve at the next tick</div>
            <h1>Pending Events</h1>
            <p class="lede">Every order your house has set in motion, in the queue the tick will resolve. Cancel before the bell — after, no.</p>
        </div>
        <div class="tick-chip">
            <span class="dot"></span>
            <span class="lbl">NEXT TICK</span>
            <span class="val">{nextTickIn}</span>
        </div>
    </header>

    <Flourish extraClass="page-flourish" />

    <div class="grid">
        <section class="timeline">
            {#if !worldId}
                <p class="empty italic">Select a world. <a href="/worlds">Choose a realm.</a></p>
            {:else if events.length === 0}
                <p class="empty italic">The realm is calm. Nothing queued.</p>
            {:else}
                {#each events as e, i}
                    <article class="event" style="border-left-color: {e.col};">
                        <div class="badge" style="background: {e.col};">
                            <Stamp kind={e.glyph} size={18} />
                        </div>
                        <div class="body">
                            <div class="row">
                                <span class="kind" style="color: {e.col}; border-color: {e.col};">{e.kind}</span>
                                <span class="who">{e.who}</span>
                                {#if e.forced}<span class="forced">FORCE-LOCKED</span>{/if}
                            </div>
                            <div class="detail">{e.detail}</div>
                        </div>
                        <div class="end">
                            <span class="eta">{timeUntil(e.nextAt)}</span>
                            <button class="cancel" disabled={e.forced} onclick={() => cancelEvent(e)}>
                                CANCEL
                            </button>
                        </div>
                    </article>
                {/each}
            {/if}
        </section>

        <aside class="sidebar">
            <div class="next">
                <div class="eyebrow gold">The next tick</div>
                <div class="big">{nextTickIn}</div>
                <ul class="kv">
                    <li><span>queued</span><span>{events.length}</span></li>
                    <li><span>force-locked</span><span>{events.filter(e => e.forced).length}</span></li>
                    <li><span>tick interval</span><span>{Math.round(($worldInfo?.tickInterval ?? 60_000) / 1000)}s</span></li>
                </ul>
            </div>

            <div class="rules">
                <div class="eyebrow">Tick rules</div>
                <ul>
                    <li>Battles resolve before movement or mobilisation.</li>
                    <li>Forced battle locks a group for at least 1 tick.</li>
                    <li>Cancellation must land before the bell — after, no.</li>
                    <li>Gathering / crafting continue through cancellations of unrelated orders.</li>
                </ul>
            </div>
        </aside>
    </div>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1300px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    .eyebrow.gold { color: var(--color-gold-pale); }
    .head { display: grid; grid-template-columns: 1fr auto; gap: 1em; align-items: start; margin-bottom: 1em; }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0; max-width: 640px; }
    .tick-chip {
        display: inline-flex; align-items: center; gap: 0.6em;
        padding: 0.6em 0.9em;
        background: rgba(176, 141, 74, 0.12);
        border: 1px solid var(--color-aged-gold);
        font-family: var(--font-mono);
        font-size: 0.85em;
        color: var(--color-aged-gold);
    }
    .tick-chip .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-aged-gold); }
    .tick-chip .lbl { font-size: 0.78em; letter-spacing: 0.18em; opacity: 0.7; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1.6em; margin-top: 1.5em; }
    .timeline { display: grid; gap: 0.7em; }
    .event { display: grid; grid-template-columns: 56px 1fr auto; gap: 1em; align-items: center; padding: 0.85em 1.1em; background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); border-left: 4px solid var(--color-ink-900); }
    .badge { width: 42px; height: 42px; color: var(--color-parchment-100); display: flex; align-items: center; justify-content: center; }
    .row { display: flex; gap: 0.7em; align-items: baseline; flex-wrap: wrap; }
    .kind { font-family: var(--font-display); font-size: 0.65rem; letter-spacing: 0.18em; padding: 0.15em 0.5em; border: 1px solid; text-transform: uppercase; }
    .who { font-family: var(--font-display); font-size: 0.95rem; letter-spacing: 0.04em; }
    .forced { font-family: var(--font-display); font-size: 0.6rem; letter-spacing: 0.18em; padding: 0.15em 0.5em; background: var(--color-vermilion); color: var(--color-parchment-100); }
    .detail { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); font-size: 0.88rem; margin-top: 0.2em; }
    .end { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.4em; }
    .eta { font-family: var(--font-mono); color: var(--color-wax-red); font-size: 0.95em; }
    .cancel { padding: 0.3em 0.7em; background: transparent; border: 1px solid var(--color-ink-900); font-family: var(--font-display); font-size: 0.62rem; letter-spacing: 0.18em; cursor: pointer; }
    .cancel:disabled { opacity: 0.4; cursor: not-allowed; }
    .empty { font-family: var(--font-editorial); padding: 2em 0; color: var(--color-ink-500); }
    .italic { font-style: italic; }
    .sidebar { display: flex; flex-direction: column; gap: 1em; }
    .next { background: var(--color-ink-900); color: var(--color-parchment-100); padding: 1.2em 1.4em; }
    .next .big { font-family: var(--font-display); font-size: 3.8rem; color: var(--color-gold-pale); line-height: 1; margin: 0.2em 0 0.4em; }
    .kv { list-style: none; padding: 0; margin: 0.5em 0 0; font-family: var(--font-mono); font-size: 0.78rem; display: grid; gap: 0.4em; }
    .kv li { display: flex; justify-content: space-between; }
    .kv li span:first-child { opacity: 0.6; }
    .kv li span:last-child { color: var(--color-gold-pale); }
    .rules { padding: 1em 1.2em; background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); }
    .rules ul { list-style: none; padding: 0; margin: 0.5em 0 0; font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-700); font-size: 0.88rem; line-height: 1.5; }
    .rules li { padding: 0.3em 0; border-top: 1px solid rgba(26, 32, 48, 0.1); }
    .rules li:first-child { border-top: none; }
    @media (max-width: 800px) {
        .head { grid-template-columns: 1fr; }
        .grid { grid-template-columns: 1fr; }
        .event { grid-template-columns: 40px 1fr; }
        .end { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; }
    }
</style>
