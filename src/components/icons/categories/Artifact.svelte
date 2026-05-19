<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Gem shape (faceted diamond) -->
  <!-- Top facets -->
  <polygon points="50,5 80,38 50,32 20,38"/>
  <!-- Left facet -->
  <polygon points="20,38 50,32 50,95"/>
  <!-- Right facet -->
  <polygon points="80,38 50,95 50,32" opacity="0.75"/>
  <!-- Bottom -->
  <polygon points="20,38 50,95 80,38" opacity="0.5"/>
</svg>
