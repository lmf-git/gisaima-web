<script>
  const { size = '1em', extraClass = '' } = $props();
</script>
<svg class="structure-icon {extraClass}" width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Gambrel roof: upper ridge -->
  <polygon points="50,5 66,28 34,28"/>
  <!-- Gambrel roof: lower flared section -->
  <polygon points="34,28 66,28 88,52 12,52"/>
  <!-- Barn walls -->
  <rect x="12" y="52" width="76" height="40"/>
</svg>
<style>
  .structure-icon { display: inline-block; vertical-align: middle; }
</style>
