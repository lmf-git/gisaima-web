<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg class={extraClass} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
  <!-- Hammer head -->
  <rect x="10" y="10" width="55" height="30" rx="4"/>
  <!-- Hammer face -->
  <rect x="55" y="14" width="18" height="22" rx="2"/>
  <!-- Handle -->
  <rect x="32" y="38" width="12" height="52" rx="3" transform="rotate(0,38,64)"/>
</svg>
