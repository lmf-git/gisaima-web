<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Coin stack front -->
  <ellipse cx="50" cy="78" rx="38" ry="12"/>
  <rect x="12" y="55" width="76" height="23"/>
  <ellipse cx="50" cy="55" rx="38" ry="12"/>
  <!-- Top coin -->
  <ellipse cx="50" cy="38" rx="38" ry="12"/>
  <rect x="12" y="22" width="76" height="16"/>
  <ellipse cx="50" cy="22" rx="38" ry="12"/>
</svg>
