<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="fish" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M-1.6 0 q1 -0.8 3 0 q-1 0.8 -3 0 Z" />
    <path d="M-1.6 0 l-0.9 -0.7 v1.4 z" />
</g>

<style>
    .fish path {
        fill: rgba(40, 60, 90, 0.9);
        stroke: rgba(20, 30, 50, 0.85);
        stroke-width: 0.22;
    }
</style>
