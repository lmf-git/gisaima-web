<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="boulder" style="transform: rotate({rot}deg) scale({scale});">
    <path class="rock" d="M-2 1 q-0.6 -2 1 -2.6 q1.6 -0.6 2.6 0.5 q1.1 1.3 0 2.3 q-1.6 1.2 -3.6 -0.2 Z" />
    <path class="shade" d="M-1.4 0.4 q0.8 -0.6 1.6 -0.6" />
</g>

<style>
    .boulder { transform-origin: 50% 100%; }
    .rock  { fill: rgba(78, 70, 58, 0.78); stroke: rgba(26, 32, 48, 0.7); stroke-width: 0.3; stroke-linejoin: round; }
    .shade { fill: none; stroke: rgba(26, 32, 48, 0.45); stroke-width: 0.2; }
</style>
