<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="lily" style="transform: rotate({rot}deg) scale({scale});">
    <ellipse cx="0" cy="0" rx="2" ry="1.1" />
    <path class="slit" d="M2 0 L0 0" />
</g>

<style>
    .lily ellipse { fill: rgba(72, 110, 78, 0.78); stroke: rgba(26, 32, 48, 0.45); stroke-width: 0.28; }
    .slit { stroke: rgba(26, 32, 48, 0.45); stroke-width: 0.2; }
</style>
