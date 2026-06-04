<script>
    import { game } from '$lib/stores/game.js';
    import Flourish from '../../components/ui/Flourish.svelte';
    import DiplomacyPanel from '../../components/features/world/DiplomacyPanel.svelte';
    import CouncilPanel from '../../components/features/world/CouncilPanel.svelte';
    import BountiesPanel from '../../components/features/world/BountiesPanel.svelte';

    // The House hall consolidates the realm's governance surfaces — diplomacy
    // (tribes), the council (votes/coffers) and the bounty board — behind one
    // entry instead of three separate top-level pages.
    const houseName = $derived($game?.player?.houseName?.trim() || null);

    const tabs = [
        { id: 'diplomacy', label: 'Diplomacy' },
        { id: 'council',   label: 'Council' },
        { id: 'bounties',  label: 'Bounties' }
    ];
    let tab = $state('diplomacy');
</script>

<svelte:head><title>House — Gisaima</title></svelte:head>

<div class="page">
    <header class="hero">
        <div class="eyebrow wax">The Hall</div>
        <h1>{houseName ? `House ${houseName}` : 'The House'}</h1>
        <p class="lede">Banners, votes, and prices on heads — the business of the house, kept under one roof.</p>
        <Flourish extraClass="page-flourish" />
    </header>

    <nav class="tabs">
        {#each tabs as t}
            <button class:active={tab === t.id} onclick={() => (tab = t.id)}>{t.label}</button>
        {/each}
    </nav>

    <div class="panel-host">
        {#if tab === 'diplomacy'}
            <DiplomacyPanel />
        {:else if tab === 'council'}
            <CouncilPanel />
        {:else}
            <BountiesPanel />
        {/if}
    </div>
</div>

<style>
    .page {
        position: relative;
        z-index: 2;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; max-width: 600px; }
    .tabs { display: flex; gap: 0; margin: 1.5em 0 1.5em; border-bottom: 1px solid var(--color-ink-900); }
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
    @media (max-width: 700px) {
        .page { padding: 6em 1.2em 4em; }
        .hero h1 { font-size: 2rem; }
        .tabs button { padding: 0.7em 0.9em; flex: 1; text-align: center; }
    }
</style>
