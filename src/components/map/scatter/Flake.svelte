<script>
    let { phase = 0, duration = 7, scale = 1, rot = 0 } = $props();
</script>

<g class="flake" style="--phase: {phase}s; --duration: {duration}s; transform: rotate({rot}deg) scale({scale});">
    <path d="M0 -1.2 L0 1.2 M-1.2 0 L1.2 0 M-0.85 -0.85 L0.85 0.85 M-0.85 0.85 L0.85 -0.85" />
</g>

<style>
    .flake {
        animation: flake-drift var(--duration, 7s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .flake path {
        fill: none;
        stroke: rgba(251, 246, 231, 0.9);
        stroke-width: 0.32;
    }
    @keyframes flake-drift {
        from { transform: translate(-0.6px, -0.4px); opacity: 0.7; }
        to   { transform: translate( 0.6px,  0.4px); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) { .flake { animation: none; } }
</style>
