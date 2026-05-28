<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="fissure" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M-2 1.5 l1 -2 l0.5 1 l1 -2.5 l1 2 l-1 1 Z" />
</g>

<style>
    .fissure path {
        fill: rgba(193, 74, 47, 0.75);
        stroke: rgba(120, 60, 40, 0.85);
        stroke-width: 0.32;
    }
</style>
