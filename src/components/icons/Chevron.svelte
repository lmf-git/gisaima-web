<script>
  // Direction-agnostic chevron. Defaults to pointing right; pass
  // direction="down" (or rotate via a parent class) to reorient. Used for
  // disclosure toggles where an emoji arrow would clash with the type.
  const { size = '1em', extraClass = '', direction = 'right' } = $props();
</script>

<svg
  class="chevron-icon chevron-{direction} {extraClass}"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <polyline points="9 6 15 12 9 18" />
</svg>

<style>
  .chevron-icon {
    display: inline-block;
    vertical-align: middle;
    transition: transform 0.2s ease;
  }
  .chevron-down { transform: rotate(90deg); }
  .chevron-left { transform: rotate(180deg); }
  .chevron-up { transform: rotate(-90deg); }
</style>
