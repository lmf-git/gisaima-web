<script>
    let { phase = 0, duration = 4.5, scale = 1, rot = 0 } = $props();
</script>

<g class="smoke" style="--phase: {phase}s; --duration: {duration}s; transform: rotate({rot}deg) scale({scale});">
    <circle cx="0"     cy="0"    r="1.1" />
    <circle cx="0.9"   cy="-1.4" r="0.8" />
    <circle cx="-0.7"  cy="-2.5" r="0.6" />
</g>

<style>
    .smoke {
        transform-origin: 50% 100%;
        animation: smoke-rise var(--duration, 4.5s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .smoke circle {
        fill: rgba(232, 228, 210, 0.55);
        stroke: rgba(26, 32, 48, 0.35);
        stroke-width: 0.18;
    }
    @keyframes smoke-rise {
        from { transform: translate( 0.5px,  0.4px); opacity: 0.6; }
        to   { transform: translate(-0.8px, -1.4px); opacity: 0.95; }
    }
    @media (prefers-reduced-motion: reduce) { .smoke { animation: none; } }
</style>
