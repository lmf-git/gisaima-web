<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="bone" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M-1.5 0 q-0.5 -0.6 0 -1 q0.5 -0.4 1 0 l1 1 q0.5 -0.4 1 0 q0.5 0.4 0 1 q-0.5 0.4 -1 0 l-1 -1 q-0.5 0.4 -1 0 z" />
</g>

<style>
    .bone path {
        fill: rgba(232, 228, 210, 0.92);
        stroke: rgba(80, 70, 60, 0.7);
        stroke-width: 0.25;
    }
</style>
