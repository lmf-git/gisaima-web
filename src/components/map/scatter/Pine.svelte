<script>
    // Pine: layered conifer with simple sway.
    let { phase = 0, duration = 5, scale = 1, rot = 0 } = $props();
</script>

<g class="pine" style="--phase: {phase}s; --duration: {duration}s; --rot: {rot}deg; --scale: {scale};">
    <path class="canopy" d="M0 -5 L-2.4 -1.4 L-1 -1.4 L-2.4 2 L-1 2 L-2 4 L2 4 L1 2 L2.4 2 L1 -1.4 L2.4 -1.4 Z" />
    <rect class="trunk" x="-0.5" y="4" width="1" height="1.6" />
</g>

<style>
    .pine {
        transform-origin: 50% 100%;
        transform: rotate(var(--rot, 0deg)) scale(var(--scale, 1));
        animation: pine-sway var(--duration, 5s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
        will-change: transform;
    }
    .canopy { fill: rgba(47, 78, 58, 0.88); stroke: rgba(20, 30, 22, 0.8); stroke-width: 0.3; stroke-linejoin: round; }
    .trunk  { fill: rgba(56, 38, 22, 0.92); stroke: rgba(26, 18, 10, 0.7); stroke-width: 0.22; }
    @keyframes pine-sway {
        from { transform: rotate(calc(var(--rot) - 3deg)) scale(var(--scale)); }
        to   { transform: rotate(calc(var(--rot) + 3deg)) scale(var(--scale)); }
    }
    @media (prefers-reduced-motion: reduce) { .pine { animation: none; } }
</style>
