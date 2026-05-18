<script>
    // Leaf: deciduous tree, rounded canopy.
    let { phase = 0, duration = 5.5, scale = 1, rot = 0 } = $props();
</script>

<g class="leaf-tree" style="--phase: {phase}s; --duration: {duration}s; --rot: {rot}deg; --scale: {scale};">
    <path class="canopy" d="M0 -3.2 c-2.4 0 -3.4 1.6 -3.4 3.2 c0 1.6 1.6 2.8 3.4 2.8 c1.8 0 3.4 -1.2 3.4 -2.8 c0 -1.6 -1 -3.2 -3.4 -3.2 Z" />
    <rect class="trunk" x="-0.4" y="2.7" width="0.8" height="1.4" />
</g>

<style>
    .leaf-tree {
        transform-origin: 50% 100%;
        transform: rotate(var(--rot, 0deg)) scale(var(--scale, 1));
        animation: leaf-sway var(--duration, 5.5s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
        will-change: transform;
    }
    .canopy { fill: rgba(60, 95, 58, 0.88); stroke: rgba(20, 30, 22, 0.8); stroke-width: 0.3; stroke-linejoin: round; }
    .trunk  { fill: rgba(56, 38, 22, 0.92); stroke: rgba(26, 18, 10, 0.7); stroke-width: 0.22; }
    @keyframes leaf-sway {
        from { transform: rotate(calc(var(--rot) - 2.5deg)) scale(var(--scale)); }
        to   { transform: rotate(calc(var(--rot) + 2.5deg)) scale(var(--scale)); }
    }
    @media (prefers-reduced-motion: reduce) { .leaf-tree { animation: none; } }
</style>
