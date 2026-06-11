<script>
  const { size = '1em', extraClass = '' } = $props();
</script>

<svg
  class="fish-icon {extraClass}"
  viewBox="0 0 512 512"
  width={size}
  height={size}
  aria-hidden="true"
>
  <path
    fill="currentColor"
    d="M340 152c-66 0-126 30-166 78-26-26-62-44-104-50-10-1-18 8-15 18 9 30 9 62 0 92-3 10 5 19 15 18 42-6 78-24 104-50 40 48 100 78 166 78 84 0 152-84 152-156S424 152 340 152zm54 130a22 22 0 1 1 0-44 22 22 0 0 1 0 44z"
  />
</svg>

<style>
  .fish-icon {
    display: inline-block;
    vertical-align: middle;
    transition: transform 0.2s ease;
  }
  .fish-icon:hover { transform: scale(1.1); }
</style>
