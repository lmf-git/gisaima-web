<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Mine shaft arch (portal silhouette) -->
  <path d="M18,92 L18,48 Q18,12 50,12 Q82,12 82,48 L82,92 Z"/>
  <!-- Horizontal support beam across the middle -->
  <rect x="15" y="46" width="70" height="8"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
