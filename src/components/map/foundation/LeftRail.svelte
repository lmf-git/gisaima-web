<script>
    import { page } from '$app/stores';
    import Logo from '../../Logo.svelte';
    import Stamp from '../../ui/Stamp.svelte';

    // Diplomacy, Council and Bounty now live inside the House hall (/house);
    // Deeds folds into the Realm profile. That keeps this rail (and the mobile
    // tab bar it becomes) short enough to fit.
    const links = [
        { href: '/map',       glyph: 'compass', label: 'World' },
        { href: '/profile',   glyph: 'banner',  label: 'Realm' },
        { href: '/house',     glyph: 'shield',  label: 'House' },
        { href: '/friends',   glyph: 'plus',    label: 'Friends' },
        { href: '/rankings',  glyph: 'crown',   label: 'Roll' },
        { href: '/trade',     glyph: 'coin',    label: 'Trade' },
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
            <Stamp kind={l.glyph} size={22} />
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
        width: 5em;              /* matches dossier --dossier-left offset */
        z-index: 90;
        background: linear-gradient(180deg, var(--chrome-panel-a) 0%, var(--chrome-panel-b) 100%);
        border-right: 0.075em solid var(--chrome-gold-soft);
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
        color: var(--chrome-gold);
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
        background: var(--chrome-gold-border);
    }

    a {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2em;
        padding: 0.55em 0;
        color: var(--chrome-text-dim);
        text-decoration: none;
        font-family: var(--font-display);
        font-size: 8px;
        letter-spacing: 0.18em;
        transition: color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        position: relative;
    }
    a span { opacity: 0.85; }
    a:hover {
        color: var(--chrome-gold);
        background: var(--chrome-gold-soft);
    }
    a.active {
        color: var(--chrome-gold);
        background: var(--chrome-gold-soft);
        box-shadow: inset 2px 0 0 var(--color-aged-gold);
    }

    @media (max-width: 700px) {
        .rail {
            width: 100%;
            height: 52px;
            top: auto;
            bottom: 0;
            border-right: none;
            border-top: 0.075em solid var(--chrome-gold-soft);
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
