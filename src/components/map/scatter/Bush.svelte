<script>
    let { phase = 0, duration = 6, scale = 1, rot = 0, hue = 'green' } = $props();
</script>

<g class="bush hue-{hue}" style="--phase: {phase}s; --duration: {duration}s; --rot: {rot}deg; --scale: {scale};">
    <ellipse class="lobe" cx="-1.1" cy="0.3" rx="1.3" ry="1" />
    <ellipse class="lobe" cx="1.1"  cy="0"   rx="1.4" ry="1.1" />
    <ellipse class="lobe" cx="0"    cy="-0.9" rx="1" ry="0.85" />
</g>

<style>
    .bush {
        transform-origin: 50% 100%;
        transform: rotate(var(--rot, 0deg)) scale(var(--scale, 1));
    }
    .lobe { stroke: rgba(20, 30, 18, 0.7); stroke-width: 0.25; }
    .hue-green  .lobe { fill: rgba(54, 80, 46, 0.82); }
    .hue-sage   .lobe { fill: rgba(80, 110, 70, 0.78); }
    .hue-dry    .lobe { fill: rgba(108, 110, 60, 0.78); }
</style>
