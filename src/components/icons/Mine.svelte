<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Mine shaft arch (portal silhouette) -->
  <path d="M18,92 L18,48 Q18,12 50,12 Q82,12 82,48 L82,92 Z"/>
  <!-- Horizontal support beam across the middle -->
  <rect x="15" y="46" width="70" height="8"/>
  <!-- Pit-lamps flanking the shaft mouth -->
  <g class="lights">
    <ellipse class="flame" cx="27" cy="40" rx="4" ry="5"/>
    <ellipse class="flame" cx="73" cy="40" rx="4" ry="5"/>
    <rect x="42" y="62" width="16" height="30"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
  .flame { fill: #ffb33a; }
</style>
