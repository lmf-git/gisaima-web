<script>
    let { scale = 1, rot = 0, snow = true } = $props();
</script>

<g class="peak" style="transform: rotate({rot}deg) scale({scale});">
    <path class="rock" d="M-3 3 L-0.5 -3 L1.5 -0.5 L3 3 Z" />
    {#if snow}
        <path class="snow" d="M-0.5 -3 L0.4 -1.3 L-1.4 -1.3 Z" />
    {/if}
</g>

<style>
    .peak { transform-origin: 50% 100%; }
    .rock { fill: rgba(110, 99, 83, 0.78); stroke: rgba(26, 32, 48, 0.7); stroke-width: 0.4; stroke-linejoin: round; }
    .snow { fill: rgba(232, 228, 210, 0.88); stroke: rgba(26, 32, 48, 0.5); stroke-width: 0.25; }
</style>
