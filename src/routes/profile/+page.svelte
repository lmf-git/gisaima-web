<script>
    import { onMount } from 'svelte';
    import { user } from '$lib/stores/user.js';
    import { game, currentPlayer } from '$lib/stores/game.js';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import CompassRose from '../../components/ui/CompassRose.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import Button from '../../components/ui/Button.svelte';

    const player = $derived($currentPlayer);
    const worldId = $derived($game.worldKey);
    const initial = $derived(($user?.displayName || $user?.email || 'G').slice(0, 1).toUpperCase());
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
                <Flourish width={200} color="var(--color-ink-900)" />
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
            <p class="lede italic">More chronicles to follow: kills, wealth, journeys, alliances forged and broken.</p>
            <Button variant="ghost" href="/worlds">Survey other realms</Button>
        </section>
    {/if}
</div>

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
    @media (max-width: 700px) {
        .block.split { grid-template-columns: 1fr; }
        .stat-grid { grid-template-columns: repeat(2, 1fr); }
        .stat:nth-child(3) { border-left: none; border-top: 1px solid rgba(26,32,48,.18); }
    }
</style>
