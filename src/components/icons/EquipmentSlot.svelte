<script>
  // SVG icon for an equipment slot. Replaces the emoji glyphs that used to
  // live in EQUIPMENT_SLOTS so the equip grid renders crisp, theme-coloured
  // icons. `slot` is a key from EQUIPMENT_SLOTS (helmet, weapon, ring1, …);
  // ring1/ring2 collapse onto the same shape.
  const { slot = '', size = '1em', extraClass = '' } = $props();

  // 24×24 viewBox paths, drawn with currentColor so they inherit slot styling.
  const PATHS = {
    helmet:   'M4 13a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2h-1v-4h-2v4H9v-4H7v4H6a2 2 0 0 1-2-2v-3z',
    back:     'M12 3l5 3v9l-5 6-5-6V6l5-3zm0 2.3L9 7v7l3 3.6L15 14V7l-3-1.7z',
    torso:    'M8 3l4 2 4-2 4 3-2 3v10H6V9L4 6l4-3zm0 2.4L6.6 6.4 8 8.5V19h8V8.5l1.4-2.1L16 5.4 12 7.3 8 5.4z',
    amulet:   'M7 3v4a5 5 0 0 0 3 4.6V13a2 2 0 1 0 4 0v-1.4A5 5 0 0 0 17 7V3h-2v4a3 3 0 0 1-6 0V3H7zm5 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    weapon:   'M6.9 3L3 6.9l9.1 9.1-1.8 1.8 1.4 1.4L14.5 17l2.3 2.3 1.4-1.4L16 13.6 21 8.6 17.1 4.7 12 9.8 6.9 3z',
    legs:     'M8 3h8v7l1 11h-4l-1-8-1 8H7l1-11V3z',
    shield:   'M12 2l8 3v6c0 5-3.4 8.7-8 11-4.6-2.3-8-6-8-11V5l8-3zm0 2.2L6 6.4V11c0 3.7 2.4 6.6 6 8.6 3.6-2 6-4.9 6-8.6V6.4l-6-2.2z',
    bracelet: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zM10 2h4v2h-4V2z',
    ring:     'M12 8a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6zM9.5 2h5l-1.2 4.2a6 6 0 0 0-2.6 0L9.5 2z',
    boots:    'M7 3h4v9h5a3 3 0 0 1 3 3v4h-7l-2-2H7V3zm2 2v10h2l2 2h4v-2a1 1 0 0 0-1-1H9V5z',
  };

  const path = $derived(PATHS[slot === 'ring1' || slot === 'ring2' ? 'ring' : slot] || null);
</script>

{#if path}
  <svg
    class="equip-slot-icon {extraClass}"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
  >
    <path d={path} fill="currentColor" />
  </svg>
{/if}

<style>
  .equip-slot-icon {
    display: inline-block;
    vertical-align: middle;
  }
</style>
