<script>
  const { type = '', size = '1em', extraClass = '' } = $props();

  // SVG path data keyed by unit key. viewBox is 0 0 24 24.
  const PATHS = {
    // Player character
    player:           'M12 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 8c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z',

    // Human units
    human_warrior:    'M9 3h6v3l2 2v3H7V8l2-2V3zM7 11v9h10v-9M10 14h4M12 11v9',
    human_scout:      'M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 7l4 2 4-2M5 20l7-8 7 8M9 17h6',
    human_knight:     'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 10h12M8 10v10h8V10M5 14l3-4M19 14l-3-4M8 14h8',

    // Goblin units
    goblin_warrior:   'M8 3l-3 5h14l-3-5H8zM5 8l2 12h10l2-12M9 12l3 4 3-4M7 6h10',
    goblin_scout:     'M14 3L9 8l-3 3 1 1 3-2M14 3l3 3-5 5-1-1M10 14l-4 6 2 1 5-5M15 9l4 1-1 5-4-2',
    goblin_raider:    'M4 20L20 4M7 17l3-7 7-3M9 9l6 6M16 4l4 4-2 2-4-4 2-2z',

    // Elf units
    elf_warrior:      'M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4M5 12h14M8 9l4 3 4-3M8 15l4-3 4 3',
    elf_scout:        'M5 12a7 7 0 0 0 14 0M5 12a7 7 0 0 1 14 0M12 5v14M15 8l-3-3-3 3',
    elf_archer:       'M5 12a7 7 0 0 0 7-7M5 12a7 7 0 0 1 7 7M5 12h14M17 8l2 4-2 4M19 12l2-1',

    // Fairy units
    fairy_warrior:    'M12 2l1 4h4l-3 3 1 4-3-2-3 2 1-4-3-3h4l1-4zM12 11v11',
    fairy_scout:      'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM6 8c-3 2-4 6-2 9M18 8c3 2 4 6 2 9M8 22l4-5 4 5',
    fairy_enchanter:  'M12 2v4M8 4l3 3M16 4l-3 3M12 6a6 6 0 0 0 0 12M12 6a6 6 0 0 1 0 12M9 12h6M12 9v6',

    // Dwarf units
    dwarf_warrior:    'M8 4h8v4l2 2v10H6V10l2-2V4zM8 8h8M10 13h4M6 14h12',
    dwarf_scout:      'M9 2l6 2-1 4H8L9 2zM7 8l-3 4 1 1 3-3M17 8l3 4-1 1-3-3M10 12l-4 8h12l-4-8h-4z',
    dwarf_defender:   'M12 3L5 7v10l7 4 7-4V7l-7-4zM9 10h6M9 14h6M12 7v10',

    // Support units
    healer:           'M11 3h2v6h6v2h-6v6h-2v-6H5v-2h6V3z',
    shaman:           'M12 2v4M9 3l2 3M15 3l-2 3M12 6a4 4 0 0 0-4 4v1l-3 2v3h14v-3l-3-2v-1a4 4 0 0 0-4-4zM9 20h6',

    // Special units
    siege_engineer:   'M3 12a9 9 0 1 0 18 0M12 3v4M5.6 5.6l2.8 2.8M18.4 5.6l-2.8 2.8M3 12h4M17 12h4M7 17l3-3M17 17l-3-3',
    elite_guard:      'M12 2L4 6v8c0 4 3.6 7.7 8 9 4.4-1.3 8-5 8-9V6l-8-4zM9 12l2 2 4-4',
    siege_ram:        'M2 14h16M4 14V10M12 14V10M16 14v-4M4 10h12M18 14l4-2-4-2M8 7l4-3 4 3',

    // Worker units
    master_craftsman: 'M14 3l7 7-9 9-7-7 9-9zM3 21l4-4M16 4l4 4M5 11l3 3',
    resource_gatherer:'M8 3a4 4 0 0 1 8 0M5 7h14M6 7l2 13h8l2-13M10 12h4M9 15h6',

    // Boats & ships
    small_boat:       'M3 17h18M5 17l2-8h10l2 8M12 9V5M9 5h6',
    medium_boat:      'M2 17h20M4 17l2-9h12l2 9M12 8V4M9 4h6M7 13h10',
    large_boat:       'M2 18h20M3 18l2-10h14l2 10M12 8V3M9 3h6M7 13h10M12 8v5',
    combat_boat:      'M2 17h20M4 17l2-8h12l2 8M12 9V5M9 5h6M7 13h10M16 9l3-3M8 9L5 6',
    steamboat:        'M2 18h20M4 18l2-9h12l2 9M9 9V5M9 5c0-2 6-2 6 0v4M14 3a2 2 0 0 1 0 4M7 13h10',
    explorer_boat:    'M2 18h20M4 18l3-10h10l3 10M12 8V3l-4 3h8l-4-3M7 13h10',
    elven_swan_boat:  'M2 18h20M5 18c0-6 4-10 7-10s7 4 7 10M12 8V4M9 5c0 3 6 3 6 0M12 8c2-2 5-2 6 0',
    dwarf_ironclad:   'M2 18h20M4 18l1-8h14l1 8M3 14h18M7 10V7h10v3M10 7V4h4v3',
    fairy_lily_pad:   'M12 18a8 8 0 0 1-8-8h16a8 8 0 0 1-8 8zM4 10a8 8 0 0 1 16 0M12 10V6M9 8l3-4 3 4',

    // NPC enemies
    ork:              'M8 4h8v2l2 2v4l-2 2v4H8v-4l-2-2V8l2-2V4zM10 4V2M14 4V2M8 12h8',
    wolf:             'M5 8l2-4 2 2 3-2 3 2 2-2 2 4M5 8v5l2 3h10l2-3V8M9 14v4M15 14v4M7 11h3M14 11h3',
    bandit:           'M7 3l5 2 5-2M7 3L5 8l7 4 7-4-2-5M5 8v8l7 4 7-4V8',
    spider:           'M12 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 8l3 4M19 8l-3 4M2 12h5M17 12h5M5 16l4-3M19 16l-4-3M8 6l2 3M16 6l-2 3',
    skeleton:         'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM9 8l-2 6h10l-2-6M7 14l-3 8M17 14l3 8M9 14v8M15 14v8M7 14h10',
    troll:            'M7 2h10v6l2 3v5H5v-5l2-3V2zM5 11h14M9 2v4M15 2v4M9 17v5M15 17v5',
    elemental:        'M12 2l2 4h4l-3 3 1 5-4-2-4 2 1-5-3-3h4l2-4zM12 12v10M9 16l3 2 3-2',
    merfolk:          'M12 2a4 4 0 0 1 4 4v4H8V6a4 4 0 0 1 4-4zM8 10l-4 6 4 2 4-2 4 2 4-2-4-6',
    sea_serpent:      'M2 18c2-4 4-4 6-2 2 2 4 2 6 0 2-2 4-4 6-2M2 12c2-4 4-6 6-4 2 2 4 4 6 2 2-2 4-2 6 0M14 4a4 4 0 0 1 4 4',
    shark:            'M2 14h18M4 14c0-5 3-8 8-8M20 14l-6-4M4 14c0 3 2 4 4 4h8',
    kraken:           'M12 2a5 5 0 0 0-5 5v5H5l-3 5h20l-3-5h-2V7a5 5 0 0 0-5-5zM5 17l-2 5M19 17l2 5M8 17v5M12 17v5M16 17v5',
    drowned:          'M7 3a5 5 0 0 1 10 0v5H7V3zM5 8h14M5 8l-2 5h18l-2-5M7 14l-2 8M17 14l2 8M10 14v8M14 14v8'
  };

  // Fallback icons by unit category/type
  const TYPE_FALLBACKS = {
    warrior:    'M18 6L6 18M16 4l4 4-2 2-4-4 2-2zM3 19l2 2 5-5-2-2-5 5z',
    scout:      'M12 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 20l7-9 7 9',
    support:    'M11 3h2v6h6v2h-6v6h-2v-6H5v-2h6V3z',
    knight:     'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 10h12v10H6z',
    archer:     'M5 12a7 7 0 0 0 14 0M5 12a7 7 0 0 1 14 0M12 5v14',
    defender:   'M12 3L5 7v6c0 4 3 7 7 8 4-1 7-4 7-8V7l-7-4z',
    raider:     'M4 20L20 4M8 16l8-8',
    enchanter:  'M12 2v4M8 4l3 3M16 4l-3 3M12 6a6 6 0 0 0 0 12',
    elite:      'M12 2L4 6v8c0 4 3.6 7.7 8 9 4.4-1.3 8-5 8-9V6l-8-4z',
    siege:      'M2 14h16M4 14V10h12v4M18 14l4-2-4-2',
    worker:     'M14 3l7 7-9 9-7-7 9-9z',
    gatherer:   'M8 3a4 4 0 0 1 8 0M5 7h14M6 7l2 13h8l2-13z',
    boat:       'M3 17h18M5 17l2-8h10l2 8M12 9V5',
    ship:       'M2 18h20M4 18l2-9h12l2 9M12 8V3',
    player:     'M12 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 8h8v12H8z',
  };

  const path = PATHS[type] || TYPE_FALLBACKS[type] || TYPE_FALLBACKS['warrior'];
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
  <path d={path} />
</svg>
