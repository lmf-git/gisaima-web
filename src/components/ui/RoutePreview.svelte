<script>
    // A rough minimap-styled schematic of a trade route: origin, destination and
    // the line between them, scaled to fit. It doesn't render terrain (the client
    // doesn't have the world's water map here) — it's a "where & how far" sketch,
    // with the mode (land/naval) colouring the lane.
    let { from = null, to = null, mode = 'land' } = $props();

    const W = 220, H = 150, PAD = 22;

    const view = $derived.by(() => {
        if (!from || !to) return null;
        const [fx, fy] = from;
        const [tx, ty] = to;
        const minX = Math.min(fx, tx), maxX = Math.max(fx, tx);
        const minY = Math.min(fy, ty), maxY = Math.max(fy, ty);
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);
        const sx = (x) => PAD + ((x - minX) / spanX) * (W - PAD * 2);
        // Screen y grows downward; map y grows up, so invert.
        const sy = (y) => PAD + ((maxY - y) / spanY) * (H - PAD * 2);
        const dist = Math.round(Math.hypot(tx - fx, ty - fy));
        return {
            ax: sx(fx), ay: sy(fy),
            bx: sx(tx), by: sy(ty),
            dist,
        };
    });
</script>

<div class="preview" class:naval={mode === 'naval'}>
    {#if !view}
        <div class="ph">Pick an origin and destination to preview the route.</div>
    {:else}
        <svg viewBox="0 0 {W} {H}" width="100%" height="100%" role="img" aria-label="Route preview">
            <!-- faint grid for the minimap feel -->
            {#each Array(6) as _, i}
                <line x1={(W / 5) * i} y1="0" x2={(W / 5) * i} y2={H} class="grid" />
            {/each}
            {#each Array(4) as _, i}
                <line x1="0" y1={(H / 3) * i} x2={W} y2={(H / 3) * i} class="grid" />
            {/each}

            <line x1={view.ax} y1={view.ay} x2={view.bx} y2={view.by} class="lane" />

            <circle cx={view.ax} cy={view.ay} r="5" class="origin" />
            <circle cx={view.bx} cy={view.by} r="5" class="dest" />
        </svg>
        <div class="legend">
            <span class="o">● from</span>
            <span class="d">● to</span>
            <span class="dist">{view.dist} tiles · {mode === 'naval' ? 'by sea' : 'by land'}</span>
        </div>
    {/if}
</div>

<style>
    .preview {
        width: 100%;
        aspect-ratio: 220 / 150;
        background: var(--color-parchment-200, #efe6d2);
        border: 1px solid var(--color-ink-900, #1a2030);
        position: relative;
        overflow: hidden;
    }
    .ph {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 1em;
        font-family: var(--font-editorial);
        font-style: italic;
        font-size: 0.8rem;
        color: var(--color-ink-500, #6b6450);
    }
    svg { display: block; }
    .grid { stroke: rgba(26, 32, 48, 0.08); stroke-width: 1; }
    .lane {
        stroke: var(--color-aged-gold, #b08d4a);
        stroke-width: 2.5;
        stroke-dasharray: 5 4;
    }
    .preview.naval .lane { stroke: #3a6ea5; }
    .origin { fill: var(--color-aged-gold, #b08d4a); stroke: var(--color-ink-900); stroke-width: 1; }
    .dest { fill: var(--color-wax-red, #5b1a1f); stroke: var(--color-ink-900); stroke-width: 1; }
    .legend {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        display: flex;
        gap: 0.8em;
        padding: 0.3em 0.6em;
        font-family: var(--font-mono);
        font-size: 0.62rem;
        background: rgba(247, 241, 227, 0.85);
        border-top: 1px solid rgba(26, 32, 48, 0.15);
        color: var(--color-ink-700, #3a3527);
    }
    .legend .o { color: var(--color-aged-gold, #b08d4a); }
    .legend .d { color: var(--color-wax-red, #5b1a1f); }
    .legend .dist { margin-left: auto; }
</style>
