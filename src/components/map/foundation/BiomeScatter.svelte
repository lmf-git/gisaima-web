<script>
    /**
     * Biome scatter — places per-glyph Svelte components inside each map
     * tile. Procedural by tile (x, y) seed, biome group, height, moisture.
     *
     * Each glyph lives in /map/scatter/*.svelte and only owns its own
     * animation. Positioning (translate / scale / rotate) is applied here
     * via an outer <g transform="…"> so the glyph's animation transform
     * never conflicts with placement — the cause of the previous "jolty"
     * water + jumping trees.
     */
    import Pine    from '../scatter/Pine.svelte';
    import Leaf    from '../scatter/Leaf.svelte';
    import Stump   from '../scatter/Stump.svelte';
    import Bush    from '../scatter/Bush.svelte';
    import Peak    from '../scatter/Peak.svelte';
    import Boulder from '../scatter/Boulder.svelte';
    import Stone   from '../scatter/Stone.svelte';
    import Ripple  from '../scatter/Ripple.svelte';
    import Fish    from '../scatter/Fish.svelte';
    import Dune    from '../scatter/Dune.svelte';
    import Cactus  from '../scatter/Cactus.svelte';
    import Bone    from '../scatter/Bone.svelte';
    import Reed    from '../scatter/Reed.svelte';
    import Lily    from '../scatter/Lily.svelte';
    import Frog    from '../scatter/Frog.svelte';
    import Flake   from '../scatter/Flake.svelte';
    import Tuft    from '../scatter/Tuft.svelte';
    import Flower  from '../scatter/Flower.svelte';
    import Smoke   from '../scatter/Smoke.svelte';
    import Fissure from '../scatter/Fissure.svelte';

    const GLYPHS = {
        pine: Pine, leaf: Leaf, stump: Stump, bush: Bush,
        peak: Peak, boulder: Boulder, stone: Stone,
        ripple: Ripple, fish: Fish,
        dune: Dune, cactus: Cactus, bone: Bone,
        reed: Reed, lily: Lily, frog: Frog,
        flake: Flake, tuft: Tuft, flower: Flower,
        smoke: Smoke, fissure: Fissure
    };

    let {
        biomeGroup = 'grass',
        x = 0, y = 0,
        height = 0.5,
        moisture = 0.5,
        rarity = 'common'
    } = $props();

    function mulberry32(a) {
        return () => {
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function densityFor(group, h, m) {
        const h01 = Math.max(0, Math.min(1, Number(h) || 0.5));
        const m01 = Math.max(0, Math.min(1, Number(m) || 0.5));
        switch (group) {
            case 'forest':   return Math.round(3 + m01 * 5);   // 3..8
            case 'mountain': return Math.round(2 + h01 * 4);   // 2..6
            case 'water':    return Math.round(3 + (1 - h01) * 3); // 3..6
            case 'desert':   return Math.round(2 + (1 - m01) * 4); // 2..6
            case 'wetland':  return Math.round(3 + m01 * 4);   // 3..7
            case 'snow':     return Math.round(2 + h01 * 4);   // 2..6
            case 'volcano':  return Math.round(2 + h01 * 3);   // 2..5
            default:         return Math.round(2 + m01 * 4);   // grass 2..6
        }
    }

    const VOCAB = {
        forest:   [['pine', 5], ['leaf', 3], ['stump', 1], ['bush', 2]],
        mountain: [['peak', 4], ['boulder', 3], ['stone', 2]],
        water:    [['ripple', 5], ['fish', 1]],
        desert:   [['dune', 4], ['cactus', 2], ['bone', 1], ['stone', 1]],
        wetland:  [['reed', 4], ['lily', 2], ['frog', 1]],
        snow:     [['flake', 4], ['tuft', 2], ['stone', 1]],
        volcano:  [['fissure', 2], ['smoke', 2], ['boulder', 3]],
        grass:    [['tuft', 5], ['flower', 2], ['stone', 1], ['bush', 2]]
    };

    function weightedPick(rng, vocab) {
        const total = vocab.reduce((a, [, w]) => a + w, 0);
        let r = rng() * total;
        for (const [kind, w] of vocab) {
            r -= w;
            if (r <= 0) return kind;
        }
        return vocab[0][0];
    }

    const items = $derived.by(() => {
        const seed = (((x | 0) * 73856093) ^ ((y | 0) * 19349663)) >>> 0;
        const rng = mulberry32(seed);
        const vocab = VOCAB[biomeGroup] || VOCAB.grass;
        const base = densityFor(biomeGroup, height, moisture);
        const rarityBoost = rarity === 'rare' ? 1 : rarity === 'epic' ? 2 : rarity === 'legendary' ? 3 : 0;
        const total = Math.min(10, Math.max(1, base + rarityBoost));

        const out = [];
        for (let i = 0; i < total; i++) {
            const cx = 2.5 + rng() * 27;
            const cy = 4 + rng() * 25;
            const scale = 0.6 + rng() * 0.9;
            const rot = (rng() - 0.5) * 26;
            const phase = rng() * 6;       // animation start offset
            const duration = 3.5 + rng() * 4.5; // per-glyph animation period
            const flip = rng() < 0.5 ? 1 : -1;
            const kind = weightedPick(rng, vocab);
            out.push({ kind, cx, cy, scale, rot, phase, duration, flip,
                       key: `${i}-${kind}-${(cx + cy * 32 + scale * 7) | 0}` });
        }
        return out;
    });
</script>

<svg
    class="scatter scatter-{biomeGroup}"
    viewBox="0 0 32 32"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
>
    {#each items as it (it.key)}
        {@const Glyph = GLYPHS[it.kind]}
        {#if Glyph}
            <g transform="translate({it.cx} {it.cy}) scale({it.scale * it.flip} {it.scale}) rotate({it.rot})">
                <Glyph phase={it.phase} duration={it.duration} />
            </g>
        {/if}
    {/each}
</svg>

<style>
    .scatter {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 0;
        overflow: visible; /* glyphs poking past tile edge stay visible */
    }
    /* Water-tinted scatter (ripples + fish) lights tiles a touch instead
       of inking them. */
    .scatter-water { mix-blend-mode: screen; opacity: 0.7; }
</style>
