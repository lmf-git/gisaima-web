<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<!-- Mars symbol ♂ -->
<svg
  class={extraClass}
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <circle cx="10" cy="14" r="6" />
  <line x1="14.5" y1="9.5" x2="20" y2="4" />
  <polyline points="15,4 20,4 20,9" />
</svg>
