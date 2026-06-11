<script>
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import Logo from '../../Logo.svelte';
    import Stamp from '../../ui/Stamp.svelte';
    import { game } from '../../../lib/stores/game.js';
    import { reports, unreadReports } from '../../../lib/stores/reports.js';

    // The rail is global chrome, so fetch reports here too — that keeps the
    // unread badge accurate even before the player opens the map this session.
    onMount(() => { if ($game?.worldKey) reports.fetch($game.worldKey); });

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
        { href: '/reports',   glyph: 'scroll',  label: 'Reports' },
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
            <span class="rail-glyph">
                <Stamp kind={l.glyph} size={22} />
                {#if l.href === '/reports' && $unreadReports > 0}
                    <span class="rail-badge" aria-label="{$unreadReports} unread reports">
                        {$unreadReports > 99 ? '99+' : $unreadReports}
                    </span>
                {/if}
            </span>
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

    /* Glyph wrapper anchors the unread badge to the icon's top-right corner. */
    .rail-glyph {
        position: relative;
        display: inline-flex;
        opacity: 1;
    }
    .rail-badge {
        position: absolute;
        top: -0.4em;
        right: -0.55em;
        min-width: 1.4em;
        padding: 0.05em 0.35em;
        border-radius: 1em;
        background: var(--color-wax-red);
        color: var(--color-parchment-100);
        font-family: var(--font-mono);
        font-size: 9px;
        font-weight: 700;
        line-height: 1.4;
        letter-spacing: 0;
        text-align: center;
        opacity: 1;
        box-shadow: 0 0 0 0.12em var(--chrome-panel-a);
        pointer-events: none;
    }
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
