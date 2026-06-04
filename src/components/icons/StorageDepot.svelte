<script>
  const { size = '1em', extraClass = '', night = false } = $props();
</script>
<svg class="structure-icon {extraClass}" class:night width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Arched roof (Quonset/barn arch) -->
  <path d="M5,58 Q5,8 50,8 Q95,8 95,58 L95,92 L5,92 Z"/>
  <!-- Lantern by the loading doors -->
  <g class="lights">
    <rect x="42" y="60" width="16" height="32"/>
    <rect x="20" y="50" width="11" height="13"/>
    <rect x="69" y="50" width="11" height="13"/>
  </g>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
  .lights { fill: #ffd24a; opacity: 0; transition: opacity 2.5s ease; }
  .structure-icon.night .lights { opacity: 1; filter: drop-shadow(0 0 1.4px #ffae2e); }
</style>
