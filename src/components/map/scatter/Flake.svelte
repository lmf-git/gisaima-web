<script>
    let { scale = 1, rot = 0 } = $props();
</script>

<g class="flake" style="transform: rotate({rot}deg) scale({scale});">
    <path d="M0 -1.2 L0 1.2 M-1.2 0 L1.2 0 M-0.85 -0.85 L0.85 0.85 M-0.85 0.85 L0.85 -0.85" />
</g>

<style>
    .flake path {
        fill: none;
        stroke: rgba(251, 246, 231, 0.9);
        stroke-width: 0.32;
    }
</style>
