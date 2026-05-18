<script>
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';

    // Diagrams = ordered nodes + arrows
    const flows = [
        {
            title: 'Battle',
            blurb: 'How two unit groups settle the question of who walks away.',
            nodes: [
                ['Meet on tile',           'attack'],
                ['Forced engagement (≥N)', 'sword'],
                ['Flee check (size %)',    'eye'],
                ['Resolve damage',         'crossed-swords'],
                ['Scavenge / Ransom',      'coin'],
                ['Write to Chronicle',     'scroll']
            ]
        },
        {
            title: 'Recruit',
            blurb: 'From queue to garrison.',
            nodes: [
                ['Choose unit',     'banner'],
                ['Check resources', 'coin'],
                ['Enqueue',         'plus'],
                ['Tick advance',    'compass'],
                ['Spawn in garrison','shield']
            ]
        },
        {
            title: 'Build',
            blurb: 'From foundation to upgrade.',
            nodes: [
                ['Pick site',        'compass'],
                ['Pay resources',    'wood'],
                ['Foundation set',   'hammer'],
                ['Upgrade queue',    'plus'],
                ['Live structure',   'tower']
            ]
        },
        {
            title: 'Conquer',
            blurb: 'Walls fall first. Loyalty changes last.',
            nodes: [
                ['Attack structure',  'crossed-swords'],
                ['Walls reduced',     'stone'],
                ['Garrison broken',   'sword'],
                ['Move in',           'banner'],
                ['Loyalty tick',      'crown'],
                ['Ownership shift',   'banner']
            ]
        },
        {
            title: 'Bounty',
            blurb: 'A coin upon a head.',
            nodes: [
                ['Post bounty',     'coin'],
                ['Hunters notified','raven'],
                ['Target slain',    'skull'],
                ['Claim (kill UID)','sword'],
                ['Reward transfer', 'coin']
            ]
        },
        {
            title: 'Death & Spawn',
            blurb: 'A life ends — another begins on the rim.',
            nodes: [
                ['Combat lost',     'skull'],
                ['Assets drop',     'coin'],
                ['Respawn cooldown','compass'],
                ['Pick spawn',      'banner'],
                ['Walk on',         'compass']
            ]
        }
    ];
</script>

<svelte:head><title>Flows — Gisaima</title></svelte:head>

<div class="page">
    <div class="eyebrow wax">The Cartographer's Diagrams</div>
    <h1>Flows of the Realm</h1>
    <p class="lede">The shapes of cause and effect, drawn plainly so the game may be read.</p>
    <Flourish width={240} color="var(--color-ink-900)" />

    <div class="grid">
        {#each flows as f}
            <section class="flow">
                <div class="eyebrow">{f.title}</div>
                <p class="blurb">{f.blurb}</p>
                <ol class="nodes">
                    {#each f.nodes as [label, glyph], i}
                        <li>
                            <span class="num">{String(i + 1).padStart(2, '0')}</span>
                            <span class="stamp"><Stamp kind={glyph} size={18} /></span>
                            <span class="label">{label}</span>
                            {#if i < f.nodes.length - 1}<span class="arrow">↓</span>{/if}
                        </li>
                    {/each}
                </ol>
            </section>
        {/each}
    </div>
</div>

<style>
    .page { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .eyebrow.wax { color: var(--color-wax-red); }
    h1 { font-family: var(--font-display); font-size: 2.8rem; letter-spacing: 0.04em; margin: 0.2em 0; }
    .lede { font-family: var(--font-editorial); font-style: italic; color: var(--color-ink-500); margin: 0 0 1em; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2em; margin-top: 2em; }
    .flow { background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 1.5em 1.5em 1em; }
    .blurb { font-family: var(--font-editorial); font-style: italic; font-size: 0.9rem; color: var(--color-ink-500); margin: 0.5em 0 1em; }
    .nodes { list-style: none; padding: 0; margin: 0; }
    .nodes li {
        position: relative;
        display: grid;
        grid-template-columns: 30px 28px 1fr;
        align-items: center;
        gap: 0.7em;
        padding: 0.5em 0;
    }
    .nodes .num { font-family: var(--font-mono); color: var(--color-ink-500); font-size: 0.85rem; }
    .nodes .stamp { display: inline-flex; color: var(--color-wax-red); }
    .nodes .label { font-family: var(--font-display); font-size: 0.92rem; letter-spacing: 0.04em; }
    .nodes .arrow {
        position: absolute;
        left: 39px;
        bottom: -6px;
        color: var(--color-ink-300);
        font-family: var(--font-mono);
        font-size: 0.9rem;
    }
</style>
