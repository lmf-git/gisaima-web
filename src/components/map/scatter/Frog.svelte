<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="frog" style="transform: rotate({rot}deg) scale({scale});">
    <ellipse class="body" cx="0" cy="0" rx="1.2" ry="0.8" />
    <circle class="eye" cx="-0.5" cy="-0.5" r="0.22" />
    <circle class="eye" cx="0.5"  cy="-0.5" r="0.22" />
</g>

<style>
    .body { fill: rgba(62, 90, 50, 0.85); stroke: rgba(26, 32, 48, 0.6); stroke-width: 0.25; }
    .eye  { fill: rgba(26, 32, 48, 0.95); }
</style>
