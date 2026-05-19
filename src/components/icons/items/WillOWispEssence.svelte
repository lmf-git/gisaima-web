<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={extraClass}
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d="M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 0 0-10 0M12 3v3M12 18v3M3 12h3M18 12h3" />
</svg>
