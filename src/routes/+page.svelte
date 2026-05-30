<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { get } from 'svelte/store';
    import { user } from '$lib/stores/user.js';
    import { game } from '$lib/stores/game.js';
    import { apiGet } from '$lib/api.js';
    import { headerRevealed, HEADER_REVEAL_MS } from '$lib/stores/ui.js';
    import CompassRose from '../components/ui/CompassRose.svelte';
    import WorldCard from '../components/specific/worlds/WorldCard.svelte';
    import Flourish from '../components/ui/Flourish.svelte';
    import Stamp from '../components/ui/Stamp.svelte';
    import Button from '../components/ui/Button.svelte';

    let worlds = $state([]);
    let loading = $state(true);
    let pageEl = $state(null);

    // On first load the above-the-fold hero waits for the header to reveal so
    // the two cascade in sequence; once the header has revealed (every later
    // navigation back to home) the hero reveals immediately with no offset.
    // Snapshot once at init — must NOT be reactive, or the offset would drop
    // mid-animation when the header finishes and snap the stagger.
    const heroBase = get(headerRevealed) ? 0 : HEADER_REVEAL_MS;

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

    // Scroll reveal: a single IntersectionObserver toggles the `.in-view`
    // class on every `.reveal` element; the fade-in + slide-up itself lives
    // in CSS. Works in every browser (no animation-timeline dependency).
    onMount(() => {
        if (typeof IntersectionObserver === 'undefined') {
            pageEl?.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                        observer.unobserve(entry.target);
                    }
                }
            },
            { threshold: 0.15 }
        );
        pageEl?.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
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

    function idOf(w) {
        return w?.id || w?._id || w?.info?.id || null;
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

<div class="page parchment-dark" bind:this={pageEl}>
    <div class="bg-rose">
        <CompassRose size={900} color="var(--color-gold-pale)" opacity={0.06} />
    </div>
    <div class="bg-glow"></div>

    <section class="hero">
        <div class="hero-text">
            <div class="eyebrow gold reveal" style="--reveal-delay: {heroBase + 0}ms">Realm{worlds.length === 1 ? '' : 's'} of {worlds.length || 'reckoning'} · Open Beta</div>
            <h1 class="reveal" style="--reveal-delay: {heroBase + 150}ms">
                <span class="line-1">An infinite world.</span>
                <span class="line-2">Time moves anyway.</span>
            </h1>
            <p class="lede reveal" style="--reveal-delay: {heroBase + 300}ms">
                A tick-based real-time MMO. Worlds run continuously — every minute is an in-realm hour.
                Hold ground, raise walls, recruit hosts, settle a coin upon a head. Free forever, MIT-licensed,
                cosmetics-only — no pay-to-win.
            </p>
            <div class="cta reveal" style="--reveal-delay: {heroBase + 450}ms">
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

            <div class="stat-row reveal" style="--reveal-delay: {heroBase + 600}ms">
                {#each stats as s}
                    <div class="stat">
                        <div class="n">{s.n}</div>
                        <div class="l">{s.l}</div>
                    </div>
                {/each}
            </div>
        </div>

        <div class="astrolabe reveal reveal-fade" style="--reveal-delay: {heroBase + 300}ms">
            <CompassRose size={540} color="var(--color-aged-gold)" opacity={0.5} />
            <!-- The world dial only appears once real world data has loaded, then
                 fades in — no blank blue placeholder while the realm is fetched. -->
            {#if featured}
                <div class="dial" transition:fade={{ duration: 400 }}>
                    <div class="dial-inner">
                        <WorldCard
                            worldId={idOf(featured)}
                            seed={seedOf(featured, 87)}
                            world={featured}
                            worldCenter={centerOf(featured)}
                            joined={!!$user}
                            tileSize={6}
                            maxCols={27}
                            maxRows={27}
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
        <header class="pillars-head reveal">
            <div class="eyebrow gold">Four laws</div>
            <h2>The Promises of the Realm</h2>
            <div class="flourish-wrap"><Flourish /></div>
        </header>
        <div class="pillar-grid">
            {#each pillars as p, i}
                <div class="pillar reveal" style="--reveal-delay: {i * 100}ms">
                    <div class="icon"><Stamp kind={p.kind} size={28} /></div>
                    <h3>{p.t.toUpperCase()}</h3>
                    <p>{p.b}</p>
                </div>
            {/each}
        </div>
    </section>

    <section class="tri">
        <div class="reveal">
            <div class="eyebrow gold">What comes next</div>
            <h3>Roadmap</h3>
            <p class="roadmap-note">The realm grows by hand. New features land here as they're drawn.</p>
        </div>
    </section>

    <footer class="page-foot reveal">
        <span>© Gisaima · MIT · drawn by hand and code</span>
        <span class="links">
            <a href="https://github.com/lmf-git/gisaima" target="_blank" rel="noopener noreferrer">github</a>
            ·
            <a href="https://discord.gg/ugmRXWNXbA" target="_blank" rel="noopener noreferrer">discord</a>
            ·
            <a href="/guide">guide</a>
        </span>
    </footer>
</div>

<style>
    /* ── Reveal animations ───────────────────────────────────────
       CSS fade-in + slide-up. Each `.reveal` starts hidden; an
       IntersectionObserver (see <script>) adds `.in-view` as the element
       scrolls into the viewport, and the CSS transition does the work.
       The per-element --reveal-delay staggers neighbours. */
    .reveal {
        opacity: 0;
        transform: translate3d(0, 1.5em, 0);
        transition:
            opacity 1.6s ease,
            transform 1.6s cubic-bezier(0.16, 1, 0.3, 1);
        transition-delay: var(--reveal-delay, 0ms);
        will-change: opacity, transform;
    }
    .reveal.reveal-fade {
        transform: none;
    }
    /* `in-view` is toggled by the IntersectionObserver in <script>. It must be
       :global — Svelte tree-shakes selectors whose classes never appear in the
       markup, which would otherwise strip this "visible" rule entirely. */
    .reveal:global(.in-view) {
        opacity: 1;
        transform: translate3d(0, 0, 0);
    }

    @media (prefers-reduced-motion: reduce) {
        .reveal {
            opacity: 1;
            transform: none;
            transition: none;
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
