<script>
    import { page } from '$app/stores';
    import Logo from '../../Logo.svelte';
    import Stamp from '../../ui/Stamp.svelte';

    const links = [
        { href: '/map',       glyph: 'compass', label: 'World' },
        { href: '/profile',   glyph: 'banner',  label: 'Realm' },
        { href: '/diplomacy', glyph: 'shield',  label: 'Diplomacy' },
        { href: '/rankings',  glyph: 'crown',   label: 'Roll' },
        { href: '/bounties',  glyph: 'skull',   label: 'Bounty' },
        { href: '/trade',     glyph: 'coin',    label: 'Trade' },
        { href: '/politics',  glyph: 'scroll',  label: 'Council' },
        { href: '/morality',  glyph: 'star',    label: 'Deeds' },
        { href: '/chronicle', glyph: 'raven',   label: 'Chronicle' }
    ];
</script>

<aside class="rail">
    <a class="brand" href="/" aria-label="Gisaima home">
        <Logo extraClass="rail-logo" />
    </a>
    <span class="brand-rule"></span>
    {#each links as l}
        <a
            href={l.href}
            title={l.label}
            class:active={$page.url.pathname === l.href}
        >
            <Stamp kind={l.glyph} size={18} />
            <span>{l.label.toUpperCase()}</span>
        </a>
    {/each}
</aside>

<style>
    .rail {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3.5em;            /* matches dossier --dossier-left offset */
        z-index: 90;
        background: linear-gradient(180deg, rgba(14, 19, 32, 0.94) 0%, rgba(19, 25, 41, 0.94) 100%);
        border-right: 0.075em solid rgba(176, 141, 74, 0.18);
        display: flex;
        flex-direction: column;
        padding: 0.5em 0 0.5em;
        gap: 0.25em;
        backdrop-filter: blur(0.5em);
    }

    .brand {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0.5em 0 0.4em;
        color: var(--color-gold-pale);
    }
    .brand :global(.rail-logo) {
        width: 4.9em;
        height: auto;
        display: block;
    }
    .brand-rule {
        display: block;
        width: 2em;
        height: 0.075em;
        margin: 0 auto 0.6em;
        background: rgba(176, 141, 74, 0.3);
    }

    a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2em;
        padding: 0.55em 0;
        color: rgba(232, 228, 210, 0.55);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 7px;
        letter-spacing: 0.18em;
        transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        position: relative;
    }
    a span { opacity: 0.85; }
    a:hover {
        color: var(--color-gold-pale);
        background: rgba(176, 141, 74, 0.06);
    }
    a.active {
        color: var(--color-gold-pale);
        background: rgba(176, 141, 74, 0.16);
        box-shadow: inset 2px 0 0 var(--color-aged-gold);
    }

    @media (max-width: 700px) {
        .rail {
            width: 100%;
            height: 52px;
            top: auto;
            bottom: 0;
            border-right: none;
            border-top: 0.075em solid rgba(176, 141, 74, 0.18);
            flex-direction: row;
            justify-content: space-around;
            padding: 0;
        }
        .brand, .brand-rule { display: none; }
        a span { display: none; }
        a { padding: 0; flex: 1; }
        a.active { box-shadow: inset 0 2px 0 var(--color-aged-gold); }
    }
</style>
