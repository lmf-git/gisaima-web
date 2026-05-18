<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="cactus" style="transform: rotate({rot}deg) scale({scale});">
    <rect class="body" x="-0.55" y="-2.5" width="1.1" height="4" rx="0.45" />
    <rect class="arm"  x="-2"     y="-1"   width="0.8" height="2"   rx="0.3" />
    <rect class="arm"  x="1.2"    y="-1.7" width="0.8" height="2.4" rx="0.3" />
</g>

<style>
    .cactus { transform-origin: 50% 100%; }
    .body, .arm {
        fill: rgba(72, 100, 60, 0.88);
        stroke: rgba(26, 32, 48, 0.5);
        stroke-width: 0.25;
    }
</style>
