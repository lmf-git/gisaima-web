<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Crenelated top (4 merlons) -->
  <path d="M5,28 L5,5 L18,5 L18,18 L34,18 L34,5 L50,5 L50,18 L66,18 L66,5 L82,5 L82,18 L95,18 L95,28 Z"/>
  <!-- Fortress wall body -->
  <rect x="5" y="28" width="90" height="62"/>
  <!-- Lit arrow-slits and a gate brazier -->
  <g class="lights">
    <rect x="20" y="44" width="9" height="16"/>
    <rect x="71" y="44" width="9" height="16"/>
    <rect x="43" y="64" width="14" height="26"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
