<script>
    let { phase = 0, duration = 2.6, scale = 1, rot = 0 } = $props();
</script>

<g class="fissure" style="--phase: {phase}s; --duration: {duration}s; transform: rotate({rot}deg) scale({scale});">
    <path d="M-2 1.5 l1 -2 l0.5 1 l1 -2.5 l1 2 l-1 1 Z" />
</g>

<style>
    .fissure {
        animation: lava-glow var(--duration, 2.6s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .fissure path {
        fill: rgba(193, 74, 47, 0.75);
        stroke: rgba(120, 60, 40, 0.85);
        stroke-width: 0.32;
    }
    @keyframes lava-glow {
        from { opacity: 0.55; }
        to   { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) { .fissure { animation: none; } }
</style>
