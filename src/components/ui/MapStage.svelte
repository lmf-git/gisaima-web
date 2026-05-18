<script>
    // Procedural terrain background — port of reference MapBg.
    let {
        seed = 7,
        cols = 40,
        rows = 22,
        tile = 28,
        showGrid = false
    } = $props();

    const TERRAIN_COLORS = {
        water: '#8fb6c2',
        shore: '#c8d6c8',
        grass: '#bdc78a',
        dry: '#cac281',
        forest: '#7a9a64',
        'deep-f': '#5a7848',
        hill: '#a89567'
    };

    const BIOME_COUNT = {
        water: 3,
        forest: 4,
        grass: 6,
        dry: 4,
        hill: 2,
        'deep-f': 2,
        shore: 0
    };

    function mulberry32(a) {
        return function () {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const cells = $derived.by(() => {
        const rnd = mulberry32(seed);
        const centers = [];
        for (const [b, n] of Object.entries(BIOME_COUNT)) {
            for (let i = 0; i < n; i++) {
                centers.push({ b, x: rnd() * cols, y: rnd() * rows, w: 0.8 + rnd() * 1.6 });
            }
        }
        const out = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                let best = null;
                let bd = 1e9;
                for (const c of centers) {
                    const d = Math.hypot(x - c.x, y - c.y) / c.w + rnd() * 0.05;
                    if (d < bd) {
                        bd = d;
                        best = c.b;
                    }
                }
                out.push({ x, y, b: best });
            }
        }
        return out;
    });
</script>

<svg
    viewBox="0 0 {cols * tile} {rows * tile}"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid slice"
    style="display: block;"
>
    {#each cells as c, i}
        <rect x={c.x * tile} y={c.y * tile} width={tile} height={tile} fill={TERRAIN_COLORS[c.b]} />
    {/each}
    {#if showGrid}
        <g stroke="rgba(0,0,0,0.05)" stroke-width="0.5">
            {#each Array.from({ length: cols + 1 }) as _, x}
                <line x1={x * tile} y1={0} x2={x * tile} y2={rows * tile} />
            {/each}
            {#each Array.from({ length: rows + 1 }) as _, y}
                <line x1={0} y1={y * tile} x2={cols * tile} y2={y * tile} />
            {/each}
        </g>
    {/if}
</svg>
