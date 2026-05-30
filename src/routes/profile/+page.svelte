<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/user.js';
    import { game, currentPlayer, listenToPlayerWorldData } from '$lib/stores/game.js';
    import { apiPost } from '$lib/api.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import CompassRose from '../../components/ui/CompassRose.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';
    import FamilyTree from '../../components/features/FamilyTree.svelte';
    import HousePicker from '../../components/specific/worlds/HousePicker.svelte';

    const player = $derived($currentPlayer);
    const worldId = $derived($game.worldKey);
    const initial = $derived(($user?.displayName || $user?.email || 'G').slice(0, 1).toUpperCase());

    // House switching ("leave/abandon" = move to another house; never house-less)
    let showHouseModal = $state(false);
    let houseSelection = $state(null);
    let switching = $state(false);
    let houseError = $state('');

    function openHouseModal() {
        houseSelection = null;
        houseError = '';
        showHouseModal = true;
    }

    async function confirmHouseSwitch() {
        if (!houseSelection || !worldId) return;
        switching = true;
        houseError = '';
        try {
            if (houseSelection.mode === 'join') {
                await apiPost(`/worlds/${encodeURIComponent(worldId)}/houses/join`, { houseId: houseSelection.houseId });
            } else {
                await apiPost(`/worlds/${encodeURIComponent(worldId)}/houses`, { name: houseSelection.houseName });
            }
            await listenToPlayerWorldData($user.uid, worldId);
            showHouseModal = false;
        } catch (e) {
            houseError = e?.message || 'Could not change house';
        } finally {
            switching = false;
        }
    }
</script>

<svelte:head><title>Player profile — Gisaima</title></svelte:head>

<div class="page">
    {#if !$user}
        <p class="empty italic">You are not signed in. <a href="/login">Take the oath.</a></p>
    {:else}
        <header class="hero">
            <div class="crest">
                <WaxSeal label={initial} color="#5b1a1f" size={84} />
            </div>
            <div>
                <div class="eyebrow wax">House</div>
                <h1>{$user.displayName || ($user.isAnonymous ? 'Guest' : $user.email?.split('@')[0]) || 'Wanderer'}</h1>
                <div class="motto">"What is written here will outlast me."</div>
                <Flourish extraClass="page-flourish" />
            </div>
        </header>

        <section class="block">
            <div class="eyebrow">Standing</div>
            <div class="stat-grid">
                <div class="stat">
                    <div class="value">{worldId || '—'}</div>
                    <div class="label">Realm</div>
                </div>
                <div class="stat">
                    <div class="value">{player?.kills ?? 0}</div>
                    <div class="label">Kills</div>
                </div>
                <div class="stat">
                    <div class="value">{player?.lastLocation ? `${player.lastLocation.x},${player.lastLocation.y}` : '—'}</div>
                    <div class="label">Last seen</div>
                </div>
                <div class="stat">
                    <div class="value">{$user.isAnonymous ? 'GUEST' : 'SWORN'}</div>
                    <div class="label">Oath</div>
                </div>
            </div>
        </section>

        <section class="block">
            <div class="eyebrow">House</div>
            <div class="house-row">
                <div>
                    <div class="house-name">{player?.houseName || '—'}</div>
                    <div class="lede italic">Every wanderer answers to a house. You may swear to another, but never to none.</div>
                </div>
                <Button variant="ghost" onclick={openHouseModal} disabled={!worldId}>Change house</Button>
            </div>
        </section>

        <section class="block split">
            <div>
                <div class="eyebrow">Heraldry</div>
                <div class="heraldry">
                    <CompassRose size={120} color="var(--color-ink-900)" opacity={0.85} />
                    <p class="lede italic">A crest is earned. Wax bears witness. This space awaits your sigil.</p>
                </div>
            </div>
            <div>
                <div class="eyebrow">Decrees</div>
                <ul class="decrees">
                    <li><Stamp kind="scroll" size={16} /> <a href="/bounties">Post or pursue bounties</a></li>
                    <li><Stamp kind="crown" size={16} /> <a href="/rankings">View the standings</a></li>
                    <li><Stamp kind="compass" size={16} /> <a href="/map">Return to the map</a></li>
                </ul>
            </div>
        </section>

        <div class="rule-deco"></div>

        <section class="block">
            <div class="eyebrow">Lineage</div>
            <FamilyTree {worldId} currentLifeId={player?.controlledLifeId ?? player?.currentLifeId} />
        </section>

        <div class="rule-deco"></div>

        <section class="block">
            <p class="lede italic">More chronicles to follow: kills, wealth, journeys, alliances forged and broken.</p>
            <Button variant="ghost" href="/worlds">Survey other realms</Button>
        </section>
    {/if}
</div>

{#if showHouseModal}
    <div
        class="house-backdrop"
        onclick={() => !switching && (showHouseModal = false)}
        onkeydown={(e) => e.key === 'Escape' && !switching && (showHouseModal = false)}
        role="button"
        tabindex="0"
        aria-label="Close"
    ></div>
    <div class="house-modal" role="dialog" aria-modal="true">
        <h2 class="modal-title">Change house</h2>
        <p class="lede italic modal-lede">Swear to an existing house or found your own. You will leave your current house in doing so.</p>
        <HousePicker worldId={worldId} bind:selection={houseSelection} currentHouseId={player?.houseId ?? null} disabled={switching} />
        {#if houseError}<div class="modal-error">{houseError}</div>{/if}
        <div class="modal-actions">
            <Button variant="ghost" onclick={() => (showHouseModal = false)} disabled={switching}>Cancel</Button>
            <Button variant="primary" onclick={confirmHouseSwitch} disabled={!houseSelection || switching}>
                {switching ? 'Swearing…' : 'Confirm'}
            </Button>
        </div>
    </div>
{/if}

<style>
    .page {
        position: relative;
        z-index: 2;
        max-width: 1000px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .empty { font-family: var(--font-editorial); color: var(--color-ink-500); text-align: center; padding: 3em 1em; }
    .italic { font-style: italic; }
    .hero {
        display: flex;
        gap: 2em;
        align-items: center;
        margin-bottom: 2.5em;
    }
    .eyebrow.wax { color: var(--color-wax-red); }
    .hero h1 {
        font-family: var(--font-display);
        font-size: 2.6rem;
        margin: 0.2em 0 0.1em;
        letter-spacing: 0.04em;
    }
    .motto {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        margin-bottom: 0.6em;
    }
    .block { margin: 2.5em 0; }
    .block.split { display: grid; grid-template-columns: 1fr 1fr; gap: 3em; align-items: start; }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
        border-top: 1px solid var(--color-ink-900);
        border-bottom: 1px solid var(--color-ink-900);
    }
    .stat {
        padding: 1.2em 1em;
        border-left: 1px solid rgba(26, 32, 48, 0.18);
    }
    .stat:first-child { border-left: none; }
    .stat .value {
        font-family: var(--font-display);
        font-size: 1.8rem;
        letter-spacing: 0.04em;
    }
    .stat .label {
        font-family: var(--font-mono);
        font-size: 9px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--color-ink-500);
        margin-top: 0.3em;
    }
    .heraldry { display: flex; gap: 1.5em; align-items: center; }
    .lede {
        font-family: var(--font-editorial);
        color: var(--color-ink-500);
        max-width: 320px;
        margin: 0;
    }
    .decrees { list-style: none; padding: 0; margin: 0; }
    .decrees li {
        display: flex;
        align-items: center;
        gap: 0.7em;
        padding: 0.7em 0;
        border-top: 1px solid rgba(26, 32, 48, 0.15);
        font-family: var(--font-body);
    }
    .decrees li:first-child { border-top: none; }
    .rule-deco { margin: 2em 0; }
    .house-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1.5em;
        flex-wrap: wrap;
        border-top: 1px solid var(--color-ink-900);
        border-bottom: 1px solid var(--color-ink-900);
        padding: 1.2em 0;
    }
    .house-name {
        font-family: var(--font-display);
        font-size: 1.8rem;
        letter-spacing: 0.04em;
        margin-bottom: 0.2em;
    }
    .house-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(14, 19, 32, 0.55);
        backdrop-filter: blur(2px);
        z-index: 999;
        cursor: pointer;
    }
    .house-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 32em;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--color-parchment-100);
        border: 1px solid var(--color-ink-900);
        box-shadow: 0 2em 5em rgba(0, 0, 0, 0.35);
        padding: 1.8em 2em;
        z-index: 1000;
        color: var(--color-ink-900);
    }
    .modal-title {
        font-family: var(--font-display);
        font-size: 1.5em;
        letter-spacing: 0.04em;
        margin: 0 0 0.3em;
        text-align: center;
    }
    .modal-lede { text-align: center; max-width: none; margin: 0 auto 1.2em; }
    .modal-error {
        color: var(--color-wax-red);
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.9em;
        margin-top: 0.8em;
        text-align: center;
    }
    .modal-actions {
        display: flex;
        justify-content: center;
        gap: 1em;
        margin-top: 1.5em;
    }
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .stat-grid { grid-template-columns: repeat(2, 1fr); }
        .stat:nth-child(3) { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
    }
</style>
