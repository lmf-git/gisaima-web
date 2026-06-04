<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Side tower (taller) with two merlons -->
  <rect x="62" y="8" width="10" height="14"/>
  <rect x="78" y="8" width="10" height="14"/>
  <rect x="60" y="20" width="32" height="72"/>
  <!-- Main building roof -->
  <polygon points="42,22 72,42 10,42"/>
  <!-- Main building walls -->
  <rect x="10" y="42" width="62" height="50"/>
  <!-- Lit window in the hall, a tower slit, and a doorway -->
  <g class="lights">
    <rect x="20" y="52" width="14" height="13"/>
    <rect x="71" y="40" width="10" height="16"/>
    <rect x="44" y="70" width="13" height="22"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
