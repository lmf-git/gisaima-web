<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Wide overhanging awning (wider than body) -->
  <polygon points="50,5 100,35 0,35"/>
  <!-- Market stall body (narrower) -->
  <rect x="20" y="35" width="60" height="57"/>
  <!-- Hanging lantern under the awning + a lit stall front -->
  <g class="lights">
    <ellipse class="flame" cx="50" cy="44" rx="5" ry="6"/>
    <rect x="28" y="58" width="12" height="12"/>
    <rect x="60" y="58" width="12" height="12"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
  .flame { fill: #ffb33a; }
</style>
