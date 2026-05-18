<script>
    import { page } from '$app/stores';
    import { game } from '$lib/stores/game.js';
    import { user } from '$lib/stores/user.js';
    import Stamp from '../ui/Stamp.svelte';
    import WaxSeal from '../ui/WaxSeal.svelte';

    // World-scoped quick-nav strip. Surfaces on every route where the
    // content depends on `$game.worldKey` so the player can hop between
    // realm-bound surfaces without losing the active world.
    const links = [
        { href: '/map',       glyph: 'compass',         label: 'Map' },
        { href: '/profile',   glyph: 'banner',          label: 'Realm' },
        { href: '/rankings',  glyph: 'crown',           label: 'Roll' },
        { href: '/trade',     glyph: 'coin',            label: 'Trade' },
        { href: '/bounties',  glyph: 'skull',           label: 'Bounty' },
        { href: '/politics',  glyph: 'scroll',          label: 'Council' },
        { href: '/morality',  glyph: 'star',            label: 'Deeds' },
        { href: '/pending',   glyph: 'hammer',          label: 'Pending' },
        { href: '/chronicle', glyph: 'raven',           label: 'Chronicle' },
        { href: '/wealth',    glyph: 'coin',            label: 'Wealth' },
        { href: '/banks',     glyph: 'scroll',          label: 'Banks' }
    ];

    const initial = $derived(
        ($user?.displayName || $user?.email || $game?.player?.displayName || 'G').slice(0, 1).toUpperCase()
    );
</script>

{#if $game?.worldKey}
    <nav class="world-bar">
        <a class="realm" href="/map" title="Return to {$game.worldKey}">
            <WaxSeal label={initial} color="#5b1a1f" size={28} />
            <span class="realm-text">
                <span class="realm-label">Realm of</span>
                <span class="realm-name">{$game.worldKey}</span>
            </span>
        </a>
        <span class="rule"></span>
        <ul class="links">
            {#each links as l}
                <li>
                    <a
                        href={l.href}
                        class:active={$page.url.pathname === l.href}
                        title={l.label}
                    >
                        <Stamp kind={l.glyph} size={13} />
                        <span class="lbl">{l.label}</span>
                    </a>
                </li>
            {/each}
        </ul>
    </nav>
{/if}

<style>
    .world-bar {
        position: fixed;
        top: 0;              /* layout header is hidden on world-scoped routes */
        left: 0;
        right: 0;
        z-index: 80;
        display: flex;
        align-items: center;
        gap: 0.8em;
        padding: 0.55em 1em;
        background: linear-gradient(180deg, rgba(14, 19, 32, 0.96), rgba(19, 25, 41, 0.96));
        border-bottom: 0.075em solid rgba(176, 141, 74, 0.35);
        color: var(--color-parchment-100);
        backdrop-filter: blur(0.4em);
        box-shadow: 0 0.4em 0.8em rgba(0, 0, 0, 0.18);
    }

    .realm {
        display: inline-flex;
        align-items: center;
        gap: 0.55em;
        text-decoration: none;
        color: var(--color-parchment-100);
        padding-right: 0.6em;
    }
    .realm-text { display: flex; flex-direction: column; line-height: 1; }
    .realm-label {
        font-family: var(--font-display);
        font-size: 0.55rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(232, 228, 210, 0.55);
    }
    .realm-name {
        font-family: var(--font-mono);
        font-size: 0.85rem;
        color: var(--color-gold-pale);
        letter-spacing: 0.05em;
        margin-top: 0.2em;
    }

    .rule {
        width: 0.075em;
        height: 1.6em;
        background: rgba(176, 141, 74, 0.3);
    }

    .links {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        gap: 0;
        flex: 1;
        overflow-x: auto;
        scrollbar-width: none;
    }
    .links::-webkit-scrollbar { display: none; }

    .links a {
        display: inline-flex;
        align-items: center;
        gap: 0.4em;
        padding: 0.5em 0.8em;
        color: rgba(232, 228, 210, 0.65);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 0.72em;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        border-bottom: 0.15em solid transparent;
        white-space: nowrap;
        transition: color 0.15s ease, border-color 0.15s ease;
    }
    .links a:hover {
        color: var(--color-gold-pale);
    }
    .links a.active {
        color: var(--color-gold-pale);
        border-bottom-color: var(--color-aged-gold);
    }
    .links a :global(svg) { color: var(--color-gold-pale); }

    @media (max-width: 700px) {
        .world-bar { padding: 0.45em 0.6em; gap: 0.5em; }
        .realm-text { display: none; }
        .links a .lbl { display: none; }
        .links a { padding: 0.45em 0.6em; }
    }
</style>
