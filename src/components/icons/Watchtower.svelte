<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Battlements: three merlons -->
  <rect x="22" y="5" width="14" height="20"/>
  <rect x="44" y="5" width="12" height="20"/>
  <rect x="64" y="5" width="14" height="20"/>
  <!-- Tower body -->
  <rect x="30" y="24" width="40" height="71"/>
  <!-- Watch-fire window + a brazier flame on the battlement -->
  <g class="lights">
    <rect x="42" y="40" width="16" height="16"/>
    <rect x="44" y="70" width="12" height="20"/>
    <ellipse class="flame" cx="50" cy="2" rx="4" ry="7"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
  .flame { fill: #ff8c2e; }
</style>
