<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { user } from '$lib/stores/user.js';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import CompassRose from '../components/ui/CompassRose.svelte';
    import WorldPreview from '../components/ui/WorldPreview.svelte';
    import Flourish from '../components/ui/Flourish.svelte';
    import Stamp from '../components/ui/Stamp.svelte';
    import Button from '../components/ui/Button.svelte';

    let worlds = $state([]);
    let loading = $state(true);

    // Pull real worlds (their seeds drive the live previews)
    onMount(async () => {
        try {
            const list = await apiGet('/worlds');
            worlds = Array.isArray(list) ? list : (list?.worlds || []);
        } catch {
            worlds = [];
        }
        loading = false;
    });

    function seedOf(w, fallback = 1) {
        const s = w?.info?.seed ?? w?.seed ?? fallback;
        return typeof s === 'number' ? s : Number(s) || fallback;
    }

    function nameOf(w) {
        return w?.info?.name || w?.name || w?._id || 'Unknown realm';
    }

    function centerOf(w) {
        const c = w?.info?.center || w?.center || { x: 0, y: 0 };
        return { x: c.x ?? 0, y: c.y ?? 0 };
    }

    const featured = $derived(worlds[0]);

    const stats = $derived([
        { n: worlds.length || '∞', l: 'Realms' },
        { n: '0',                   l: 'To pay' },
        { n: 'MIT',                 l: 'License' },
        { n: 'Live',                l: 'In open beta' }
    ]);

    const pillars = [
        { kind: 'compass', t: 'Infinite worlds',       b: 'Walk forever. Procedural, every direction.' },
        { kind: 'hammer',  t: 'Real-time, tick-based', b: 'Strategy unfolds in hours, not in clicks.' },
        { kind: 'coin',    t: 'No pay-to-win',         b: 'Cosmetics only. Every player stands on equal ground.' },
        { kind: 'scroll',  t: 'Open source',           b: 'MIT-licensed. Read it, run it, fork it.' }
    ];
</script>

<svelte:head>
    <title>Gisaima — Hardcore Strategic Territory Control MMO</title>
    <meta name="description" content="Hardcore no P2W strategic MMO. Discover rare terrain, build structures, command unit groups, and forge alliances in an ever-expanding universe." />
</svelte:head>

<div class="page parchment-dark">
    <div class="bg-rose">
        <CompassRose size={900} color="var(--color-gold-pale)" opacity={0.06} />
    </div>
    <div class="bg-glow"></div>

    <section class="hero">
        <div class="hero-text">
            <div class="eyebrow gold reveal" style="--reveal-delay: 0ms">Realm{worlds.length === 1 ? '' : 's'} of {worlds.length || 'reckoning'} · Open Beta</div>
            <h1 class="reveal" style="--reveal-delay: 100ms">
                <span class="line-1">An infinite world.</span>
                <span class="line-2">Time moves anyway.</span>
            </h1>
            <p class="lede reveal" style="--reveal-delay: 220ms">
                A tick-based real-time MMO. Worlds run continuously — every minute is an in-realm hour.
                Hold ground, raise walls, recruit hosts, settle a coin upon a head. Free forever, MIT-licensed,
                cosmetics-only — no pay-to-win.
            </p>
            <div class="cta reveal" style="--reveal-delay: 340ms">
                {#if $user && $game?.worldKey && $game?.player?.alive}
                    <Button variant="primary" href="/map">
                        <Stamp kind="compass" size={14} />
                        Resume game
                    </Button>
                {:else if $user}
                    <Button variant="primary" href="/worlds">
                        <Stamp kind="banner" size={14} />
                        Begin your reign
                    </Button>
                {:else}
                    <Button variant="primary" href="/signup">
                        <Stamp kind="banner" size={14} />
                        Begin your reign
                    </Button>
                {/if}
                <a class="ghost-link" href="/guide">
                    Game guide
                    <Stamp kind="eye" size={14} />
                </a>
            </div>

            <div class="stat-row reveal" style="--reveal-delay: 460ms">
                {#each stats as s}
                    <div class="stat">
                        <div class="n">{s.n}</div>
                        <div class="l">{s.l}</div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="astrolabe reveal reveal-fade" style="--reveal-delay: 200ms">
            <CompassRose size={540} color="var(--color-aged-gold)" opacity={0.5} />
            <!-- The world dial only appears once real world data has loaded, then
                 fades in — no blank blue placeholder while the realm is fetched. -->
            {#if featured}
                <div class="dial" transition:fade={{ duration: 400 }}>
                    <div class="dial-inner">
                        <WorldPreview
                            seed={seedOf(featured, 87)}
                            center={centerOf(featured)}
                            cols={44}
                            rows={44}
                            tile={10}
                        />
                    </div>
                </div>
                <div class="tick-chip" transition:fade={{ duration: 400 }}>
                    <Stamp kind="compass" size={11} />
                    {nameOf(featured)}
                </div>
            {/if}
        </div>
    </section>

    <section class="pillars">
        <header class="pillars-head reveal reveal-scroll">
            <div class="eyebrow gold">Four laws</div>
            <h2>The Promises of the Realm</h2>
            <div class="flourish-wrap"><Flourish /></div>
        </header>
        <div class="pillar-grid">
            {#each pillars as p, i}
                <div class="pillar reveal reveal-scroll" style="--reveal-delay: {200 + i * 120}ms">
                    <div class="icon"><Stamp kind={p.kind} size={28} /></div>
                    <h3>{p.t.toUpperCase()}</h3>
                    <p>{p.b}</p>
                </div>
            {/each}
        </div>
    </section>

    <section class="tri">
        <div class="reveal reveal-scroll">
            <div class="eyebrow gold">What comes next</div>
            <h3>Roadmap</h3>
            <p class="roadmap-note">The realm grows by hand. New features land here as they're drawn.</p>
        </div>
    </section>

    <footer class="page-foot">
        <span>© Gisaima · MIT · drawn by hand and code</span>
        <span class="links">
            <a href="https://github.com/lmf-git/gisaima" target="_blank" rel="noopener noreferrer">github</a>
            ·
            <a href="https://discord.gg/ugmRXWNXbA" target="_blank" rel="noopener noreferrer">discord</a>
            ·
            <a href="/guide">chronicle</a>
        </span>
    </footer>
</div>

<style>
    /* ── Reveal animations ───────────────────────────────────────
       Pure CSS. Hero content (.reveal) animates up on page load with a
       staggered --reveal-delay. Below-the-fold blocks (.reveal-scroll)
       are driven by the scroll position via animation-timeline: view()
       where supported, and simply shown otherwise. */
    .reveal {
        opacity: 0;
        transform: translate3d(0, 1.5em, 0);
        animation: reveal-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        animation-delay: var(--reveal-delay, 0ms);
    }
    .reveal-fade {
        transform: none;
        animation-name: reveal-fade;
    }
    @keyframes reveal-in {
        from { opacity: 0; transform: translate3d(0, 1.5em, 0); }
        to   { opacity: 1; transform: translate3d(0, 0, 0); }
    }
    @keyframes reveal-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    /* Scroll-driven reveals: progressive enhancement. Without scroll
       timeline support the content is simply visible (no hidden state). */
    .reveal-scroll {
        opacity: 1;
        transform: none;
        animation: none;
    }
    @supports (animation-timeline: view()) {
        .reveal-scroll {
            opacity: 0;
            transform: translate3d(0, 2em, 0);
            animation: reveal-in 1s cubic-bezier(0.16, 1, 0.3, 1) both;
            animation-timeline: view();
            animation-range: entry 0% cover 30%;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .reveal,
        .reveal-scroll {
            opacity: 1;
            transform: none;
            animation: none;
        }
    }

    .page {
        position: relative;
        min-height: calc(100vh - 6em);
        padding: 4em 0 0;
        overflow: hidden;
        color: #e8e4d2;
        font-family: var(--font-body);
    }
    .bg-rose {
        position: absolute;
        left: -100px;
        top: -50px;
        pointer-events: none;
        z-index: 0;
        transform-origin: 500px 500px;
        animation: rose-spin 240s linear infinite;
    }
    @keyframes rose-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
        .bg-rose { animation: none; }
    }
    .bg-glow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background: radial-gradient(ellipse at 80% 30%, rgba(176, 141, 74, 0.12), transparent 50%);
    }
    .eyebrow.gold { color: var(--color-gold-pale); }

    .hero {
        position: relative;
        z-index: 2;
        max-width: 1200px;
        margin: 0 auto;
        padding: 4em 4em 6em;
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        gap: 4em;
        align-items: center;
    }

    .hero-text h1 {
        font-family: var(--font-display);
        font-size: clamp(2.5rem, 5.5vw, 5.5rem);
        letter-spacing: 0.02em;
        line-height: 0.95;
        margin: 0.4em 0 0.6em;
        color: #fbf6e7;
    }
    .hero-text h1 .line-1 { display: block; }
    .hero-text h1 .line-2 { display: block; color: var(--color-gold-pale); }
    .hero-text .lede {
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 1.25rem;
        line-height: 1.45;
        color: rgba(232, 228, 210, 0.7);
        max-width: 540px;
        margin: 0 0 1.8em;
    }
    .cta {
        display: flex;
        align-items: center;
        gap: 1.4em;
        margin-bottom: 2.4em;
        flex-wrap: wrap;
    }
    .ghost-link {
        font-family: var(--font-display);
        font-size: 0.78rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--color-parchment-100);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.6em;
        padding: 0.7em 0;
        border-bottom: 1px solid rgba(251, 246, 231, 0.4);
    }
    .ghost-link:hover { color: var(--color-gold-pale); border-color: var(--color-gold-pale); }

    .stat-row { display: flex; gap: 2.5em; flex-wrap: wrap; }
    .stat .n { font-family: var(--font-display); font-size: 2rem; color: var(--color-gold-pale); }
    .stat .l {
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.2em;
        color: rgba(232, 228, 210, 0.5);
        text-transform: uppercase;
        margin-top: 0.2em;
    }

    .astrolabe {
        position: relative;
        aspect-ratio: 1 / 1;
        width: 100%;
        max-width: 520px;
        margin-left: auto;
    }
    .astrolabe :global(svg:first-child) { width: 100%; height: 100%; }
    .dial {
        position: absolute;
        inset: 12%;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid var(--color-aged-gold);
        box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.6), 0 0 60px rgba(176, 141, 74, 0.4);
    }
    .dial-inner { width: 100%; height: 100%; background: #88b7c4; }
    .tick-chip {
        position: absolute;
        left: 50%;
        bottom: 4%;
        transform: translateX(-50%);
        background: rgba(14, 19, 32, 0.85);
        padding: 6px 12px;
        border: 1px solid var(--color-aged-gold);
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--color-gold-pale);
        display: flex;
        align-items: center;
        gap: 0.4em;
        white-space: nowrap;
        max-width: 80%;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pillars {
        position: relative;
        z-index: 2;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2em 4em 6em;
    }
    .pillars-head {
        text-align: center;
        margin-bottom: 2.5em;
    }
    .pillars-head h2 {
        font-family: var(--font-display);
        font-size: 2.4rem;
        letter-spacing: 0.04em;
        color: #fbf6e7;
        margin: 0.3em 0 0.6em;
    }
    .flourish-wrap {
        color: var(--color-aged-gold);
        display: flex;
        justify-content: center;
    }
    .pillar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.5em; }
    .pillar { border-top: 1px solid var(--color-aged-gold); padding-top: 1.5em; }
    .pillar .icon { color: var(--color-gold-pale); margin-bottom: 0.8em; }
    .pillar h3 {
        font-family: var(--font-display);
        font-size: 1.05rem;
        letter-spacing: 0.1em;
        color: #fbf6e7;
        margin: 0 0 0.5em;
    }
    .pillar p {
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.95rem;
        line-height: 1.5;
        color: rgba(232, 228, 210, 0.65);
        margin: 0;
    }

    .tri {
        position: relative;
        z-index: 2;
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 4em 4em;
        display: grid;
        grid-template-columns: 1.2fr 1fr 1fr;
        gap: 2.4em;
    }
    .tri h3 { font-family: var(--font-display); font-size: 1.4rem; margin: 0.4em 0 1em; color: #fbf6e7; }
    .roadmap-note {
        margin: 0.6em 0 0;
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.95rem;
        color: rgba(232, 228, 210, 0.6);
    }

    .page-foot {
        position: relative;
        z-index: 2;
        padding: 1.6em 4em;
        border-top: 1px solid rgba(176, 141, 74, 0.25);
        display: flex;
        justify-content: space-between;
        font-family: var(--font-mono);
        font-size: 11px;
        color: rgba(232, 228, 210, 0.5);
    }
    .page-foot a { color: rgba(232, 228, 210, 0.7); text-decoration: none; }
    .page-foot a:hover { color: var(--color-gold-pale); }

    @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; padding: 2em 1.5em 4em; gap: 3em; }
        .astrolabe { max-width: 380px; margin: 0 auto; }
        .pillars { padding: 2em 1.5em 4em; }
        .pillar-grid { grid-template-columns: 1fr 1fr; gap: 1.5em; }
        .tri { grid-template-columns: 1fr; padding: 0 1.5em 4em; gap: 3em; }
        .page-foot { padding: 1.4em 1.5em; flex-direction: column; gap: 0.5em; }
    }
    @media (max-width: 520px) {
        .pillar-grid { grid-template-columns: 1fr; }
    }
</style>
