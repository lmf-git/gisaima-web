<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="stone" style="transform: rotate({rot}deg) scale({scale});">
    <ellipse class="rock" cx="0" cy="0" rx="1.2" ry="0.7" />
    <path class="shade" d="M-1.1 0 q1.1 -0.4 2.2 0" />
</g>

<style>
    .stone { transform-origin: 50% 100%; }
    .rock  { fill: rgba(82, 75, 65, 0.78); stroke: rgba(26, 32, 48, 0.7); stroke-width: 0.28; }
    .shade { fill: none; stroke: rgba(26, 32, 48, 0.4); stroke-width: 0.18; }
</style>
