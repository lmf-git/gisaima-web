<script>
    let { scale = 1, rot = 0, petal = '#dc8ca0' } = $props();
</script>

<g class="flower" style="transform: rotate({rot}deg) scale({scale}); --petal: {petal};">
    <path class="stem" d="M0 0 l0 1.5" />
    <circle class="petal" cx="-0.6" cy="-0.4" r="0.55" />
    <circle class="petal" cx="0.6"  cy="-0.4" r="0.55" />
    <circle class="petal" cx="0"    cy="-1"   r="0.55" />
    <circle class="petal" cx="0"    cy="0.4"  r="0.55" />
    <circle class="centre" cx="0" cy="-0.3" r="0.32" />
</g>

<style>
    .flower { transform-origin: 50% 100%; }
    .petal {
        fill: var(--petal, rgba(220, 140, 160, 0.85));
        stroke: rgba(120, 60, 60, 0.55);
        stroke-width: 0.18;
    }
    .centre { fill: rgba(220, 200, 100, 0.95); stroke: rgba(120, 90, 30, 0.5); stroke-width: 0.15; }
    .stem   { stroke: rgba(60, 80, 36, 0.75); stroke-width: 0.32; fill: none; }
</style>
