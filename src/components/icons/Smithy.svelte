<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Horn (left pointed extension) -->
  <path d="M5,65 Q5,52 22,50 L22,68 Z"/>
  <!-- Top surface / face -->
  <rect x="22" y="28" width="65" height="24" rx="4"/>
  <!-- Neck -->
  <rect x="36" y="52" width="36" height="12"/>
  <!-- Base -->
  <rect x="22" y="64" width="65" height="22" rx="3"/>
  <!-- Forge fire glowing through the anvil-front -->
  <g class="lights">
    <rect x="34" y="70" width="42" height="12" rx="2"/>
    <ellipse class="flame" cx="55" cy="58" rx="6" ry="6"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffb733; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.8px #ff6a14); }
  .flame { fill: #ff5e14; }
</style>
