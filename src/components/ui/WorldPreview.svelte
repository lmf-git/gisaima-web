<script>
    import { onMount } from 'svelte';
    import { TerrainGenerator } from 'gisaima-shared/map/noise';

    // Renders a live world preview from a real world seed using the shared
    // TerrainGenerator (same generator the /map page uses). Renders to a
    // <canvas> so we can paint hundreds of tiles cheaply.
    let {
        seed = 1,
        center = { x: 0, y: 0 },
        cols = 32,
        rows = 32,
        tile = 8, // pixels per tile
        // When provided, the preview becomes interactive: clicking a tile calls
        // onTileClick({ x, y }) with that tile's world coordinates.
        onTileClick = null
    } = $props();

    let canvasEl;

    // Map a pointer event to the world-space tile it landed on. The canvas is
    // CSS-scaled to 100%, so translate via its rendered rect, not pixel size.
    function tileAt(clientX, clientY) {
        const rect = canvasEl.getBoundingClientRect();
        const xi = Math.floor(((clientX - rect.left) / rect.width) * cols);
        const yi = Math.floor(((clientY - rect.top) / rect.height) * rows);
        const gx = (center?.x ?? 0) - Math.floor(cols / 2) + xi;
        const gy = (center?.y ?? 0) - Math.floor(rows / 2) + yi;
        return { x: gx, y: gy };
    }

    function handleClick(e) {
        if (!onTileClick) return;
        onTileClick(tileAt(e.clientX, e.clientY));
    }

    function paint() {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        const w = cols * tile;
        const h = rows * tile;
        canvasEl.width = w;
        canvasEl.height = h;

        const seedNum = typeof seed === 'number' ? seed : Number(seed) || 1;
        const gen = new TerrainGenerator(seedNum, Math.max(256, cols * rows));

        const halfC = Math.floor(cols / 2);
        const halfR = Math.floor(rows / 2);
        const cx = center?.x ?? 0;
        const cy = center?.y ?? 0;

        for (let yi = 0; yi < rows; yi++) {
            for (let xi = 0; xi < cols; xi++) {
                const gx = cx - halfC + xi;
                const gy = cy - halfR + yi;
                const t = gen.getTerrainData(gx, gy);
                ctx.fillStyle = t?.color || '#7a9a64';
                ctx.fillRect(xi * tile, yi * tile, tile, tile);
            }
        }
    }

    onMount(paint);
    $effect(() => {
        // re-paint when inputs change
        seed; center?.x; center?.y; cols; rows; tile;
        paint();
    });
</script>

<canvas
    bind:this={canvasEl}
    class="world-preview"
    class:interactive={!!onTileClick}
    onclick={handleClick}
    role={onTileClick ? 'button' : undefined}
    tabindex={onTileClick ? 0 : undefined}
    aria-label={onTileClick ? 'Open this realm on the map' : undefined}
></canvas>

<style>
    .world-preview {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: -moz-crisp-edges;
        image-rendering: crisp-edges;
    }
    .world-preview.interactive {
        cursor: pointer;
    }
</style>
