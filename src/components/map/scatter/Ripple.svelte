<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="ripple" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M-4 0 q2 -1.5 4 0 t4 0" />
</g>

<style>
    .ripple path {
        fill: none;
        stroke: rgba(232, 240, 245, 0.7);
        stroke-width: 0.55;
        stroke-linecap: round;
    }
</style>
