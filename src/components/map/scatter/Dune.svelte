<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="dune" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M-4 1 q2 -2 4 0 t4 0" />
</g>

<style>
    .dune { transform-origin: 50% 50%; }
    .dune path {
        fill: none;
        stroke: rgba(110, 80, 40, 0.55);
        stroke-width: 0.48;
        stroke-linecap: round;
    }
</style>
