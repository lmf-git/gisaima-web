<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<!-- Venus symbol ♀ -->
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
  <circle cx="12" cy="9" r="6" />
  <line x1="12" y1="15" x2="12" y2="22" />
  <line x1="9" y1="19" x2="15" y2="19" />
</svg>
