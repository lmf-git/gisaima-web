<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Dome on top -->
  <path d="M18,48 Q18,8 50,8 Q82,8 82,48 Z"/>
  <!-- Building walls -->
  <rect x="10" y="48" width="80" height="44"/>
  <!-- A row of study-lamps in the windows -->
  <g class="lights">
    <rect x="20" y="58" width="11" height="14"/>
    <rect x="44" y="58" width="11" height="14"/>
    <rect x="68" y="58" width="11" height="14"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
