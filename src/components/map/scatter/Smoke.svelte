<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="smoke" style="transform: rotate({rot}deg) scale({scale});">
    <circle cx="0"     cy="0"    r="1.1" />
    <circle cx="0.9"   cy="-1.4" r="0.8" />
    <circle cx="-0.7"  cy="-2.5" r="0.6" />
</g>

<style>
    .smoke circle {
        fill: rgba(232, 228, 210, 0.55);
        stroke: rgba(26, 32, 48, 0.35);
        stroke-width: 0.18;
    }
</style>
