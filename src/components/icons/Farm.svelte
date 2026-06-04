<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Gambrel roof: upper ridge -->
  <polygon points="50,5 66,28 34,28"/>
  <!-- Gambrel roof: lower flared section -->
  <polygon points="34,28 66,28 88,52 12,52"/>
  <!-- Barn walls -->
  <rect x="12" y="52" width="76" height="40"/>
  <!-- Hayloft lamp + a lit barn door -->
  <g class="lights">
    <rect x="44" y="34" width="12" height="11"/>
    <rect x="42" y="66" width="16" height="26"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
