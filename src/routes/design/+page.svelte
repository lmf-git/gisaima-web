<script>
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import CompassRose from '../../components/ui/CompassRose.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import TileGlyph from '../../components/ui/TileGlyph.svelte';
    import Stamp from '../../components/ui/Stamp.svelte';
    import ResourceStrip from '../../components/ui/ResourceStrip.svelte';
    import Button from '../../components/ui/Button.svelte';

    const parchment = [
        ['#fbf6e7', 'Parchment 100', '--color-parchment-100', '#1a2030'],
        ['#f5ecd1', 'Parchment 200', '--color-parchment-200', '#1a2030'],
        ['#ecdfb6', 'Parchment 300', '--color-parchment-300', '#1a2030'],
        ['#d9c89a', 'Parchment 400', '--color-parchment-400', '#1a2030'],
        ['#7d7b6f', 'Ink 300', '--color-ink-300', '#fff'],
        ['#4b5267', 'Ink 500', '--color-ink-500', '#fff'],
        ['#2d3548', 'Ink 700', '--color-ink-700', '#fff'],
        ['#1a2030', 'Ink 900', '--color-ink-900', '#fff'],
        ['#0e1320', 'Ink 1000', '--color-ink-1000', '#fff'],
        ['#6f8c7a', 'Sage', '--color-sage', '#fff'],
        ['#3f5a4e', 'Sage Deep', '--color-sage-deep', '#fff'],
        ['#b8c9b3', 'Sage Pale', '--color-sage-pale', '#1a2030']
    ];

    const heraldic = [
        ['#9a3320', 'Vermilion', '--color-vermilion', '#fff'],
        ['#c14a2f', 'Vermilion 2', '--color-vermilion-2', '#fff'],
        ['#5b1a1f', 'Wax Red', '--color-wax-red', '#fff'],
        ['#b08d4a', 'Aged Gold', '--color-aged-gold', '#fff'],
        ['#d4b170', 'Gold Pale', '--color-gold-pale', '#1a2030'],
        ['#16393f', 'Teal Deep', '--color-teal-deep', '#fff']
    ];

    const terrain = [
        ['#88b7c4', 'water'],
        ['#c8d6c8', 'shore'],
        ['#b9c889', 'grass'],
        ['#c9c581', 'dry'],
        ['#6f8d5b', 'forest'],
        ['#4f6e3f', 'deep-f'],
        ['#a89863', 'hill'],
        ['#6e6353', 'mountain'],
        ['#e8e4d2', 'snow']
    ];

    const typeSpecimens = [
        { family: 'Cinzel', token: '--font-display', specimen: 'GISAIMA', size: 88, weight: 700, role: 'Display · Roman caps · brand, headings, map labels' },
        { family: 'EB Garamond', token: '--font-body', specimen: 'Worlds beyond reckoning, drawn anew each dawn.', size: 32, weight: 500, role: 'Body · long-form copy, dialog, descriptions' },
        { family: 'IM Fell English', token: '--font-editorial', specimen: 'A scout returns at first light…', size: 28, weight: 400, italic: true, role: 'Decorative · pull quotes, lore, captions' },
        { family: 'JetBrains Mono', token: '--font-mono', specimen: '−23 | −8   ·   t+39s   ·   12,480g', size: 24, weight: 500, role: 'UI · coordinates, timers, counters, currency' }
    ];

    const seals = [
        { label: 'G',           color: '#5b1a1f', tag: 'FOUNDER', size: 64 },
        { glyph: 'star',        color: '#16393f', tag: 'ALLIED', size: 56 },
        { glyph: 'cross',       color: '#3f5a4e', tag: 'NEUTRAL', size: 56 },
        { glyph: 'crossed-swords', color: '#9a3320', tag: 'WAR', size: 56 }
    ];

    const tiles = ['village', 'tower', 'beast', 'unit', 'ruin'];
</script>

<svelte:head>
    <title>Design system — Gisaima</title>
</svelte:head>

<div class="page">
    <header class="hero">
        <div class="eyebrow">Foundations</div>
        <h1>Heraldry of Gisaima</h1>
        <p class="lede">Logo-derived parchment, ink and heraldic accents. Map terrain colors live alongside the UI palette so HUD overlays sit naturally on the cartography.</p>
        <Flourish width={220} color="var(--color-ink-900)" />
    </header>

    <section class="block">
        <div class="eyebrow">Parchment & Ink</div>
        <div class="swatch-grid">
            {#each parchment as [hex, name, tok, fg]}
                <div class="swatch" style="background: {hex}; color: {fg};">
                    <span class="sw-name">{name}</span>
                    <span class="sw-hex">{hex}</span>
                    <span class="sw-tok">{tok}</span>
                </div>
            {/each}
        </div>

        <div class="eyebrow mt">Heraldic Accents</div>
        <div class="swatch-grid">
            {#each heraldic as [hex, name, tok, fg]}
                <div class="swatch" style="background: {hex}; color: {fg};">
                    <span class="sw-name">{name}</span>
                    <span class="sw-hex">{hex}</span>
                    <span class="sw-tok">{tok}</span>
                </div>
            {/each}
        </div>

        <div class="eyebrow mt">Terrain</div>
        <div class="swatch-grid">
            {#each terrain as [hex, name]}
                <div class="swatch" style="background: {hex}; color: #1a2030;">
                    <span class="sw-name">{name.toUpperCase()}</span>
                    <span class="sw-hex">{hex}</span>
                </div>
            {/each}
        </div>
    </section>

    <hr class="rule-deco" />

    <section class="block">
        <div class="eyebrow">Typography</div>
        <h2>The Cartographer's Hand</h2>
        <p class="lede italic">Four families. Cinzel for monumental display, Garamond for readable body, IM Fell for editorial flourishes, JetBrains Mono for the only thing that should ever look modern — coordinates and numbers.</p>

        {#each typeSpecimens as t}
            <div class="type-row">
                <div class="type-meta">
                    <span class="family">{t.family.toUpperCase()}</span>
                    <span class="role">{t.role}</span>
                </div>
                <div
                    class="specimen"
                    style="
                        font-family: var({t.token});
                        font-size: {t.size}px;
                        font-weight: {t.weight};
                        font-style: {t.italic ? 'italic' : 'normal'};
                        letter-spacing: {t.token === '--font-display' ? '0.04em' : 'normal'};
                    "
                >
                    {t.specimen}
                </div>
            </div>
        {/each}
    </section>

    <hr class="rule-deco" />

    <section class="block">
        <div class="eyebrow">Components</div>
        <h2>Buttons, badges, seals</h2>

        <div class="comp-grid">
            <div>
                <div class="eyebrow small">Buttons</div>
                <div class="row">
                    <Button variant="primary">Enter the Realm</Button>
                    <Button variant="ghost">Read the Chronicle</Button>
                    <Button variant="danger">Lay Siege</Button>
                    <Button variant="soft"><Stamp kind="compass" size={14} /> Jump to coords</Button>
                </div>
            </div>

            <div>
                <div class="eyebrow small">Wax seals · status</div>
                <div class="row">
                    {#each seals as s}
                        <div class="seal-cell">
                            <WaxSeal label={s.label} glyph={s.glyph} color={s.color} size={s.size} />
                            <div class="seal-tag">{s.tag}</div>
                        </div>
                    {/each}
                </div>
            </div>

            <div>
                <div class="eyebrow small">Tile glyphs · ink-stamp</div>
                <div class="tile-grid">
                    {#each tiles as kind}
                        <div class="tile-cell">
                            <div class="tile">
                                <TileGlyph {kind} size={28} />
                            </div>
                            <div class="tile-label">{kind}</div>
                        </div>
                    {/each}
                </div>
            </div>

            <div>
                <div class="eyebrow small">Motifs</div>
                <div class="motif-row">
                    <CompassRose size={96} color="var(--color-ink-900)" opacity={0.85} />
                    <div>
                        <Flourish width={220} color="var(--color-ink-900)" />
                        <div class="motto">"Here be dragons" — and so it is written.</div>
                    </div>
                </div>
            </div>

            <div class="span-2">
                <div class="eyebrow small">Resource strip · in-game HUD</div>
                <ResourceStrip
                    items={[
                        { kind: 'coin', value: '12,480', label: 'Gold' },
                        { kind: 'wheat', value: '3,210', label: 'Wheat' },
                        { kind: 'wood', value: '1,840', label: 'Wood' },
                        { kind: 'stone', value: '928', label: 'Stone' },
                        { kind: 'banner', value: '8', label: 'Hosts' }
                    ]}
                />
            </div>
        </div>
    </section>
</div>

<style>
    .page {
        position: relative;
        z-index: 2;
        max-width: 1100px;
        margin: 0 auto;
        padding: 7em 2em 4em;
        color: var(--color-ink-900);
    }
    .hero {
        text-align: left;
        margin-bottom: 3em;
    }
    .hero h1 {
        font-family: var(--font-display);
        font-size: 3rem;
        margin: 0.3em 0 0.4em;
        letter-spacing: 0.04em;
    }
    .lede {
        font-family: var(--font-editorial);
        font-style: italic;
        color: var(--color-ink-500);
        max-width: 600px;
        margin: 0 0 1.5em;
        font-size: 1.05rem;
    }
    .lede.italic {
        margin: 0 0 2em;
    }
    .block {
        margin: 3em 0;
    }
    .block h2 {
        font-family: var(--font-display);
        font-size: 2rem;
        margin: 0.3em 0 1em;
    }
    .mt {
        margin-top: 2em;
        margin-bottom: 0.5em;
    }
    .swatch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 8px;
    }
    .swatch {
        border-radius: 2px;
        height: 90px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 8px;
        font-family: var(--font-mono);
        font-size: 9px;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    }
    .sw-name {
        font-family: var(--font-display);
        font-size: 11px;
        letter-spacing: 0.1em;
    }
    .sw-hex { opacity: 0.7; }
    .sw-tok { opacity: 0.5; margin-top: 1px; }
    .type-row {
        border-top: 1px solid rgba(26, 32, 48, 0.18);
        padding: 20px 0 24px;
    }
    .type-meta {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 10px;
    }
    .family {
        font-family: var(--font-display);
        font-size: 14px;
        letter-spacing: 0.18em;
    }
    .role {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--color-ink-500);
    }
    .specimen { line-height: 1.05; }
    .comp-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
    }
    .span-2 { grid-column: 1 / -1; }
    .row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
    }
    .eyebrow.small { margin-bottom: 14px; }
    .seal-cell { text-align: center; }
    .seal-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        margin-top: 8px;
    }
    .tile-grid {
        display: grid;
        grid-template-columns: repeat(5, 48px);
        gap: 8px;
    }
    .tile-cell { text-align: center; }
    .tile {
        width: 48px;
        height: 48px;
        background: var(--color-terrain-grass, #bdc78a);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(26, 32, 48, 0.2);
    }
    .tile-label {
        font-family: var(--font-mono);
        font-size: 9px;
        margin-top: 6px;
        color: var(--color-ink-500);
    }
    .motif-row {
        display: flex;
        align-items: center;
        gap: 24px;
    }
    .motto {
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 18px;
        margin-top: 14px;
        color: var(--color-ink-700);
    }
    hr.rule-deco {
        border: none;
        margin: 3em 0;
    }
    @media (max-width: 700px) {
        .comp-grid { grid-template-columns: 1fr; }
        .hero h1 { font-size: 2rem; }
        .specimen { font-size: 1.5rem !important; }
    }
</style>
