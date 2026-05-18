<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="stump" style="transform: rotate({rot}deg) scale({scale});">
    <ellipse class="top" cx="0" cy="0" rx="1.4" ry="0.6" />
    <path class="side" d="M-1.4 0 v1 q1.4 0.4 2.8 0 v-1" />
    <path class="rings" d="M-0.7 0 q0.7 -0.25 1.4 0 M-0.4 0 q0.4 -0.14 0.8 0" />
</g>

<style>
    .stump  { transform-origin: 50% 100%; }
    .top    { fill: rgba(82, 60, 38, 0.92); stroke: rgba(26, 18, 10, 0.6); stroke-width: 0.25; }
    .side   { fill: rgba(56, 38, 22, 0.92); stroke: rgba(26, 18, 10, 0.6); stroke-width: 0.25; }
    .rings  { fill: none; stroke: rgba(26, 18, 10, 0.65); stroke-width: 0.18; }
</style>
