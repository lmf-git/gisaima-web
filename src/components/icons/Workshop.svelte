<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Chimney (tall, above roof) -->
  <rect x="60" y="5" width="15" height="38"/>
  <!-- Gabled roof -->
  <polygon points="50,10 90,42 10,42"/>
  <!-- Walls -->
  <rect x="14" y="42" width="72" height="50"/>
  <!-- Furnace glow in the window + chimney embers -->
  <g class="lights">
    <rect x="24" y="54" width="16" height="16"/>
    <rect x="56" y="54" width="14" height="16"/>
    <ellipse class="flame" cx="67" cy="6" rx="5" ry="6"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffce3a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.6px #ff8c1e); }
  .flame { fill: #ff7a1e; }
</style>
