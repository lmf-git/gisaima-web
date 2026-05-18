<script>
    let { phase = 0, duration = 4, scale = 1, rot = 0 } = $props();
</script>

<g class="frog" style="--phase: {phase}s; --duration: {duration}s; transform: rotate({rot}deg) scale({scale});">
    <ellipse class="body" cx="0" cy="0" rx="1.2" ry="0.8" />
    <circle class="eye" cx="-0.5" cy="-0.5" r="0.22" />
    <circle class="eye" cx="0.5"  cy="-0.5" r="0.22" />
</g>

<style>
    .frog {
        animation: hop var(--duration, 4s) ease-in-out infinite;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .body { fill: rgba(62, 90, 50, 0.85); stroke: rgba(26, 32, 48, 0.6); stroke-width: 0.25; }
    .eye  { fill: rgba(26, 32, 48, 0.95); }
    @keyframes hop {
        0%, 80%, 100% { transform: translateY(0); }
        90%           { transform: translateY(-0.6px); }
    }
    @media (prefers-reduced-motion: reduce) { .frog { animation: none; } }
</style>
