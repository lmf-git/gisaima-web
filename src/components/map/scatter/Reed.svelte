<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="reed" style="--rot: {rot}deg; --scale: {scale};">
    <path d="M0 1 l0 -5 M-1 -3.5 q1 -1 2 0" />
    <path d="M-1.4 1 l0 -4 M-2.4 -2.5 q1 -0.8 2 0" />
</g>

<style>
    .reed {
        transform-origin: 50% 100%;
        transform: rotate(var(--rot)) scale(var(--scale));
    }
    .reed path {
        fill: none;
        stroke: rgba(64, 90, 62, 0.9);
        stroke-width: 0.42;
        stroke-linecap: round;
    }
</style>
