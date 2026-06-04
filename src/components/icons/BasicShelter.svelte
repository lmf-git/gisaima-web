<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <polygon points="50,5 95,42 95,95 5,95 5,42"/>
  <!-- Hearth glow through the doorway + a shuttered window, lit after dark -->
  <g class="lights">
    <rect x="43" y="68" width="14" height="27"/>
    <rect x="22" y="58" width="11" height="11"/>
    <rect x="67" y="58" width="11" height="11"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
