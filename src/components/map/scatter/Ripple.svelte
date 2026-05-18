<script>
    let { phase = 0, duration = 6, scale = 1, rot = 0 } = $props();
</script>

<g class="ripple" style="--phase: {phase}s; --duration: {duration}s; transform: rotate({rot}deg) scale({scale});">
    <path d="M-4 0 q2 -1.5 4 0 t4 0" />
</g>

<style>
    .ripple {
        transform-origin: 50% 50%;
        animation: ripple-drift var(--duration, 6s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .ripple path {
        fill: none;
        stroke: rgba(232, 240, 245, 0.7);
        stroke-width: 0.55;
        stroke-linecap: round;
    }
    @keyframes ripple-drift {
        from { transform: translateX(-1.5px); opacity: 0.55; }
        to   { transform: translateX( 1.5px); opacity: 0.95; }
    }
    @media (prefers-reduced-motion: reduce) { .ripple { animation: none; } }
</style>
