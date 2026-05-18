<script>
    let { phase = 0, duration = 5.2, scale = 1, rot = 0, hue = 'grass' } = $props();
</script>

<g class="tuft hue-{hue}" style="--phase: {phase}s; --duration: {duration}s; --rot: {rot}deg; --scale: {scale};">
    <path d="M0 0 q-0.6 -2 0 -3.5 M-0.85 0 q-0.5 -1.6 0 -3 M0.85 0 q0.5 -1.6 0 -3" />
</g>

<style>
    .tuft {
        transform-origin: 50% 100%;
        transform: rotate(var(--rot)) scale(var(--scale));
        animation: tuft-sway var(--duration, 5.2s) ease-in-out infinite alternate;
        animation-delay: calc(var(--phase, 0s) * -1);
    }
    .tuft path {
        fill: none;
        stroke-width: 0.42;
        stroke-linecap: round;
    }
    .hue-grass path { stroke: rgba(60, 80, 36, 0.7); }
    .hue-snow  path { stroke: rgba(120, 130, 90, 0.7); }
    .hue-dry   path { stroke: rgba(120, 110, 50, 0.7); }
    @keyframes tuft-sway {
        from { transform: rotate(calc(var(--rot) - 3deg)) scale(var(--scale)); }
        to   { transform: rotate(calc(var(--rot) + 3deg)) scale(var(--scale)); }
    }
    @media (prefers-reduced-motion: reduce) { .tuft { animation: none; } }
</style>
