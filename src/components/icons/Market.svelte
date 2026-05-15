<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Wide overhanging awning (wider than body) -->
  <polygon points="50,5 100,35 0,35"/>
  <!-- Market stall body (narrower) -->
  <rect x="20" y="35" width="60" height="57"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
