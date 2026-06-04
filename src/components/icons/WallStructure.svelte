<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Crenelated top (3 merlons, wide wall) -->
  <path d="M5,30 L5,8 L22,8 L22,20 L38,20 L38,8 L56,8 L56,20 L72,20 L72,8 L88,8 L88,20 L95,20 L95,30 Z"/>
  <!-- Wall body -->
  <rect x="5" y="30" width="90" height="60"/>
  <!-- Torches set along the rampart -->
  <g class="lights">
    <ellipse class="flame" cx="28" cy="6" rx="3.5" ry="6"/>
    <ellipse class="flame" cx="64" cy="6" rx="3.5" ry="6"/>
    <rect x="42" y="58" width="16" height="32"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
  .flame { fill: #ff8c2e; }
</style>
