<script>
  import { apiPost } from '../../../lib/api.js';
  import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import { EQUIPMENT_SLOTS, SLOT_ORDER } from 'gisaima-shared/definitions/EQUIPMENT_SLOTS.js';
  import { game, currentPlayer } from '../../../lib/stores/game.js';
  import Race from '../../icons/Race.svelte';
  import Unit from '../../icons/Unit.svelte';
  import Back from '../../icons/Back.svelte';
  import Sword from '../../icons/Sword.svelte';
  import Shield from '../../icons/Shield.svelte';
  import EquipmentSlot from '../../icons/EquipmentSlot.svelte';

  const {
    unit,
    unitId,
    group,
    tileData,
    onClose    = () => {},
    onEquipped = () => {},
  } = $props();

  const _fmt = t => t?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  // Equipment grid layout: 5 rows × 3 cols, keyed by `${row}-${col}`
  const GRID = {};
  for (const [slotKey, def] of Object.entries(EQUIPMENT_SLOTS)) {
    GRID[`${def.row}-${def.col}`] = slotKey;
  }

  // Picker state
  let pickerSlot    = $state(null);   // slot key being picked
  let pickerSource  = $state('group'); // 'group' | 'structure'
  let pickerStorage = $state('shared'); // 'shared' | 'personal'
  let equipping     = $state(false);
  let errorMsg      = $state('');

  // Current equipment (live-reactive to prop)
  let equipment = $derived(unit.equipment || {});

  // Unit definition lookup
  const unitDef = $derived(() => {
    if (!unit.type) return null;
    return Object.values(UNITS).find(u => u.type === unit.type) || UNITS[unit.type] || null;
  });

  // Typed combat stats scaled by level (attack stats scale, carryCapacity does not)
  const combatStats = $derived(() => {
    const def = unitDef();
    if (!def) return { meleeAtk: 0, rangedAtk: 0, magicAtk: 0, meleeDef: 0, rangedDef: 0, magicDef: 0 };
    const sf = 1 + ((unit.level || 1) - 1) * 0.15;
    return {
      meleeAtk: (def.meleeAttack  || 0) * sf,
      rangedAtk: (def.rangedAttack || 0) * sf,
      magicAtk:  (def.magicAttack  || 0) * sf,
      meleeDef:  (def.meleeDefense  || 0) * sf,
      rangedDef: (def.rangedDefense || 0) * sf,
      magicDef:  (def.magicDefense  || 0) * sf,
    };
  });

  // Equipment attack/defense bonuses (shown alongside base stats)
  const equipBonus = $derived(() => {
    let atk = 0, def = 0;
    for (const slot of SLOT_ORDER) {
      const code = equipment[slot];
      if (!code) continue;
      atk += ITEMS[code]?.stats?.attack  || 0;
      def += ITEMS[code]?.stats?.defense || 0;
    }
    return { atk, def };
  });

  // Items available for the current picker slot
  const pickerItems = $derived(() => {
    if (!pickerSlot) return [];
    const items = [];

    if (pickerSource === 'group') {
      const groupItems = group?.items || {};
      for (const [code, qty] of Object.entries(groupItems)) {
        if (typeof qty !== 'number' || qty < 1) continue;
        const def = ITEMS[code];
        if (!def || def.equipSlot !== pickerSlot) continue;
        items.push({ code, qty, def });
      }
    } else {
      const structure = tileData?.structure;
      if (structure) {
        const src = pickerStorage === 'personal'
          ? (structure.banks?.[$currentPlayer?.id] || {})
          : (structure.items || {});
        for (const [code, qty] of Object.entries(src)) {
          if (code.startsWith('_')) continue;
          const qty2 = typeof qty === 'number' ? qty : 0;
          if (qty2 < 1) continue;
          const def = ITEMS[code];
          if (!def || def.equipSlot !== pickerSlot) continue;
          items.push({ code, qty: qty2, def });
        }
      }
    }
    return items;
  });

  const hasStructure = $derived(!!tileData?.structure);
  const hasPersonalBank = $derived(
    !!tileData?.structure?.banks?.[$currentPlayer?.id] &&
    Object.keys(tileData.structure.banks[$currentPlayer.id]).filter(k => !k.startsWith('_')).length > 0
  );

  function openPicker(slot) {
    pickerSlot = slot;
    errorMsg = '';
  }

  function closePicker() {
    pickerSlot = null;
    errorMsg = '';
  }

  async function equip(itemCode, source, storageType) {
    if (equipping) return;
    equipping = true;
    errorMsg = '';
    try {
      await apiPost('/actions/equipItem', {
        worldId:     $game.worldKey,
        tileX:       tileData.x,
        tileY:       tileData.y,
        groupId:     group.id,
        unitId,
        slot:        pickerSlot,
        itemCode,
        source,
        storageType: storageType || 'shared',
      });
      closePicker();
      onEquipped();
    } catch (e) {
      errorMsg = e.message || 'Failed to equip item';
    } finally {
      equipping = false;
    }
  }

  async function unequip(slot) {
    if (equipping) return;
    equipping = true;
    errorMsg = '';
    try {
      await apiPost('/actions/equipItem', {
        worldId: $game.worldKey,
        tileX:   tileData.x,
        tileY:   tileData.y,
        groupId: group.id,
        unitId,
        slot,
        itemCode: null,
      });
      onEquipped();
    } catch (e) {
      errorMsg = e.message || 'Failed to unequip item';
    } finally {
      equipping = false;
    }
  }
</script>

<div class="unit-details-modal">
  <header class="modal-header">
    <button class="unit-back-btn" onclick={onClose} aria-label="Back to details">
      <Back size="1.1em" />
      <span>Back</span>
    </button>
    <div class="unit-header-info">
      <div class="unit-header-icon">
        {#if unit.type === 'player'}
          <Race raceKey={unit.race} extraClass="unit-hdr-icon" />
        {:else}
          <Unit unitIconKey={unit.type} extraClass="unit-hdr-icon" />
        {/if}
      </div>
      <div>
        <div class="unit-header-name">
          {unit.displayName || unit.name || _fmt(unit.type)}
          {#if unit.type === 'player' && unit.uid === $currentPlayer?.id}
            <span class="badge you-badge">You</span>
          {/if}
        </div>
        <div class="unit-header-sub">
          {#if unit.race}<span class="badge race-badge">{_fmt(unit.race)}</span>{/if}
          <span class="badge type-badge">{_fmt(unit.type)}</span>
          {#if unit.type !== 'player'}<span class="badge lv-badge">Lv {unit.level ?? 1}</span>{/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Stats section: two rows (attack / defense + carry) -->
  <div class="stats-section">
    <div class="stats-row atk-row">
      <div class="stat">
        <span class="stat-label">M.Atk</span>
        <span class="stat-value atk-val">{combatStats().meleeAtk.toFixed(1)}</span>
        {#if equipBonus().atk > 0}<span class="stat-bonus">+{equipBonus().atk}</span>{/if}
      </div>
      <div class="stat">
        <span class="stat-label">R.Atk</span>
        <span class="stat-value atk-val">{combatStats().rangedAtk.toFixed(1)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Mg.Atk</span>
        <span class="stat-value atk-val">{combatStats().magicAtk.toFixed(1)}</span>
      </div>
    </div>
    <div class="stats-row def-row">
      <div class="stat">
        <span class="stat-label">M.Def</span>
        <span class="stat-value def-val">{combatStats().meleeDef.toFixed(1)}</span>
        {#if equipBonus().def > 0}<span class="stat-bonus">+{equipBonus().def}</span>{/if}
      </div>
      <div class="stat">
        <span class="stat-label">R.Def</span>
        <span class="stat-value def-val">{combatStats().rangedDef.toFixed(1)}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Mg.Def</span>
        <span class="stat-value def-val">{combatStats().magicDef.toFixed(1)}</span>
      </div>
      <div class="stat carry-stat">
        <span class="stat-label">Carry</span>
        <span class="stat-value carry-val">{unitDef()?.carryCapacity ?? '—'}</span>
      </div>
    </div>
  </div>

  {#if errorMsg}
    <div class="error-bar">{errorMsg}</div>
  {/if}

  <!-- Equipment grid (5 rows × 3 cols) -->
  <div class="equip-section">
    <div class="equip-label">Equipment</div>
    <div class="equip-grid">
      {#each [0, 1, 2, 3, 4] as row}
        {#each [0, 1, 2] as col}
          {@const slotKey = GRID[`${row}-${col}`]}
          {#if slotKey}
            {@const slotDef = EQUIPMENT_SLOTS[slotKey]}
            {@const equipped = equipment[slotKey]}
            {@const itemDef = equipped ? ITEMS[equipped] : null}
            <div class="equip-cell">
              <button
                class="equip-slot"
                class:occupied={!!equipped}
                onclick={() => openPicker(slotKey)}
                title={slotDef.name}
              >
                {#if equipped && itemDef}
                  <div class="slot-item-icon" title={itemDef.name}>
                    {#if itemDef.stats?.attack}
                      <Sword size="1.4em" />
                    {:else if itemDef.stats?.defense}
                      <Shield size="1.4em" />
                    {:else}
                      <EquipmentSlot slot={slotKey} size="1.4em" />
                    {/if}
                  </div>
                  <div class="slot-item-name">{itemDef.name}</div>
                {:else}
                  <div class="slot-empty-icon"><EquipmentSlot slot={slotKey} size="1.4em" /></div>
                  <div class="slot-label">{slotDef.name}</div>
                {/if}
              </button>
              {#if equipped && itemDef}
                <button
                  class="slot-unequip"
                  onclick={(e) => { e.stopPropagation(); unequip(slotKey); }}
                  disabled={equipping}
                  title="Unequip"
                >✕</button>
              {/if}
            </div>
          {:else}
            <!-- empty grid cell -->
            <div class="equip-cell-empty"></div>
          {/if}
        {/each}
      {/each}
    </div>
  </div>

  <!-- Item picker panel -->
  {#if pickerSlot}
    {@const slotDef = EQUIPMENT_SLOTS[pickerSlot]}
    <div class="picker-panel">
      <div class="picker-header">
        <span>Equip {slotDef.name}</span>
        <button class="picker-close-btn" onclick={closePicker}>✕</button>
      </div>

      <!-- Source tabs -->
      <div class="source-tabs">
        <button class="src-tab" class:active={pickerSource === 'group'}
          onclick={() => (pickerSource = 'group')}>Group</button>
        {#if hasStructure}
          <button class="src-tab" class:active={pickerSource === 'structure'}
            onclick={() => (pickerSource = 'structure')}>Structure</button>
        {/if}
      </div>

      {#if pickerSource === 'structure' && hasPersonalBank}
        <div class="storage-tabs">
          <button class="stor-tab" class:active={pickerStorage === 'shared'}
            onclick={() => (pickerStorage = 'shared')}>Shared</button>
          <button class="stor-tab" class:active={pickerStorage === 'personal'}
            onclick={() => (pickerStorage = 'personal')}>Personal</button>
        </div>
      {/if}

      <div class="picker-items">
        {#if pickerItems().length === 0}
          <div class="picker-empty">No {slotDef.name.toLowerCase()} available</div>
        {:else}
          {#each pickerItems() as { code, qty, def }}
            <button
              class="picker-item"
              disabled={equipping}
              onclick={() => equip(code, pickerSource, pickerStorage)}
            >
              <div class="pi-name">{def.name}</div>
              <div class="pi-meta">
                {#if def.stats?.attack}  <span class="pi-stat atk">+{def.stats.attack} ATK</span>{/if}
                {#if def.stats?.defense} <span class="pi-stat def">+{def.stats.defense} DEF</span>{/if}
                {#if def.stats?.speed}   <span class="pi-stat spd">+{def.stats.speed} SPD</span>{/if}
                <span class="pi-qty">×{qty}</span>
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .unit-details-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7em 0.9em;
    background: rgba(176, 141, 74, 0.08);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
    gap: 0.5em;
  }

  .unit-back-btn {
    display: flex;
    align-items: center;
    gap: 0.3em;
    background: transparent;
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    color: var(--color-gold-pale);
    font-family: var(--font-display);
    font-size: 0.65em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.4em 0.6em;
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color 0.15s, color 0.15s;
  }
  .unit-back-btn:hover {
    background: rgba(176, 141, 74, 0.12);
    color: var(--color-parchment-100);
  }

  .unit-header-info {
    display: flex;
    align-items: center;
    gap: 0.7em;
    flex: 1;
    min-width: 0;
  }

  .unit-header-icon {
    width: 2.4em;
    height: 2.4em;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.unit-hdr-icon) {
    width: 2.4em;
    height: 2.4em;
  }

  .unit-header-name {
    font-weight: 600;
    font-size: 1em;
    color: var(--color-parchment-100);
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
  }

  .unit-header-sub {
    display: flex;
    gap: 0.3em;
    margin-top: 0.2em;
    flex-wrap: wrap;
  }

  .badge {
    font-size: 0.72em;
    padding: 0.15em 0.45em;
    font-weight: 500;
    white-space: nowrap;
    font-family: var(--font-display);
    letter-spacing: 0.05em;
  }
  .you-badge   { background: rgba(63, 90, 78, 0.2); color: #6fcf79; border: 0.075em solid rgba(76, 175, 80, 0.3); }
  .race-badge  { background: rgba(176, 141, 74, 0.1); color: var(--color-gold-pale); border: 0.075em solid rgba(176, 141, 74, 0.25); }
  .type-badge  { background: rgba(176, 141, 74, 0.06); color: rgba(232, 228, 210, 0.65); border: 0.075em solid rgba(176, 141, 74, 0.15); }
  .lv-badge    { background: rgba(91, 26, 31, 0.12); color: #c97d85; border: 0.075em solid rgba(91, 26, 31, 0.25); }

  .stats-section {
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .stats-row {
    display: flex;
    gap: 0;
  }

  .atk-row {
    background: rgba(91, 26, 31, 0.05);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.1);
  }

  .def-row {
    background: rgba(176, 141, 74, 0.03);
  }

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4em 0.25em;
    border-right: 0.075em solid rgba(176, 141, 74, 0.12);
  }
  .stat:last-child { border-right: none; }

  .carry-stat { flex: 1; }

  .stat-label {
    font-size: 0.62em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(232, 228, 210, 0.5);
    font-weight: 600;
    white-space: nowrap;
    font-family: var(--font-display);
  }

  .stat-value {
    font-size: 0.95em;
    font-weight: 700;
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }

  .atk-val { color: #c97d85; }
  .def-val { color: var(--color-gold-pale); }
  .carry-val { color: rgba(232, 228, 210, 0.65); }

  .stat-bonus {
    font-size: 0.65em;
    color: #6fcf79;
    font-weight: 600;
    font-family: var(--font-mono);
  }

  .error-bar {
    padding: 0.5em 0.9em;
    background: rgba(91, 26, 31, 0.15);
    color: #ff5757;
    font-size: 0.85em;
    border-bottom: 0.075em solid rgba(91, 26, 31, 0.3);
  }

  .equip-section {
    padding: 0.7em 0.9em;
    overflow-y: auto;
    flex: 1;
  }

  .equip-label {
    font-size: 0.65em;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-aged-gold);
    font-weight: 700;
    margin-bottom: 0.6em;
    font-family: var(--font-display);
  }

  .equip-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.4em;
  }

  .equip-cell {
    position: relative;
  }

  .equip-slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.5em 0.3em;
    min-height: 4.5em;
    width: 100%;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em dashed rgba(176, 141, 74, 0.25);
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
    font-family: inherit;
    text-align: center;
    gap: 0.25em;
    color: var(--color-parchment-100);
  }

  .equip-slot:hover {
    background: rgba(176, 141, 74, 0.1);
    border-color: rgba(176, 141, 74, 0.5);
  }

  .equip-slot.occupied {
    background: rgba(176, 141, 74, 0.1);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
  }

  .equip-cell-empty {
    min-height: 4.5em;
  }

  .slot-empty-icon {
    font-size: 1.4em;
    opacity: 0.3;
    color: var(--color-parchment-200);
  }

  .slot-label {
    font-size: 0.65em;
    color: rgba(232, 228, 210, 0.4);
    font-weight: 500;
    font-family: var(--font-display);
    letter-spacing: 0.05em;
  }

  .slot-item-icon {
    font-size: 1.3em;
    color: var(--color-gold-pale);
  }

  .slot-item-name {
    font-size: 0.62em;
    color: var(--color-parchment-200);
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .slot-unequip {
    position: absolute;
    top: 0.2em;
    right: 0.2em;
    background: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.3);
    color: #ff5757;
    font-size: 0.55em;
    padding: 0.1em 0.3em;
    cursor: pointer;
    line-height: 1;
    transition: background-color 0.15s;
    font-family: inherit;
  }

  .slot-unequip:hover { background: rgba(91, 26, 31, 0.3); }
  .slot-unequip:disabled { opacity: 0.5; cursor: not-allowed; }

  .picker-close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.1em 0.3em;
    display: flex;
    transition: background-color 0.2s;
    flex-shrink: 0;
    color: var(--color-parchment-100);
    font-size: 0.9em;
  }
  .picker-close-btn:hover { background: rgba(176, 141, 74, 0.12); }

  .picker-panel {
    border-top: 0.075em solid rgba(176, 141, 74, 0.18);
    background: rgba(20, 26, 42, 0.95);
    max-height: 40vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5em 0.9em;
    font-weight: 600;
    font-size: 0.9em;
    color: var(--color-parchment-100);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
    background: rgba(176, 141, 74, 0.06);
    font-family: var(--font-display);
    letter-spacing: 0.06em;
  }

  .source-tabs, .storage-tabs {
    display: flex;
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .src-tab, .stor-tab {
    flex: 1;
    background: none;
    border: none;
    padding: 0.35em 0.5em;
    font-size: 0.78em;
    font-weight: 500;
    color: rgba(232, 228, 210, 0.55);
    cursor: pointer;
    font-family: var(--font-display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: color 0.15s;
    border-bottom: 2px solid transparent;
  }
  .src-tab:hover, .stor-tab:hover { color: var(--color-parchment-200); }
  .src-tab.active, .stor-tab.active {
    color: var(--color-gold-pale);
    border-bottom-color: var(--color-aged-gold);
  }

  .picker-items {
    overflow-y: auto;
    flex: 1;
    padding: 0.4em;
    display: flex;
    flex-direction: column;
    gap: 0.3em;
  }

  .picker-empty {
    padding: 1.5em;
    text-align: center;
    color: rgba(232, 228, 210, 0.45);
    font-size: 0.85em;
    font-style: italic;
  }

  .picker-item {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    padding: 0.55em 0.7em;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background-color 0.15s;
    color: var(--color-parchment-100);
  }
  .picker-item:hover:not(:disabled) {
    background: rgba(176, 141, 74, 0.1);
    border-color: rgba(176, 141, 74, 0.4);
  }
  .picker-item:disabled { opacity: 0.6; cursor: not-allowed; }

  .pi-name {
    font-weight: 600;
    font-size: 0.9em;
    color: var(--color-parchment-100);
  }

  .pi-meta {
    display: flex;
    gap: 0.3em;
    flex-wrap: wrap;
    align-items: center;
  }

  .pi-stat {
    font-size: 0.72em;
    padding: 0.1em 0.4em;
    font-weight: 600;
    white-space: nowrap;
    font-family: var(--font-mono);
  }
  .pi-stat.atk { background: rgba(91, 26, 31, 0.15); color: #c97d85; border: 0.075em solid rgba(91, 26, 31, 0.25); }
  .pi-stat.def { background: rgba(176, 141, 74, 0.1); color: var(--color-gold-pale); border: 0.075em solid rgba(176, 141, 74, 0.2); }
  .pi-stat.spd { background: rgba(63, 90, 78, 0.12); color: #6fcf79; border: 0.075em solid rgba(76, 175, 80, 0.2); }

  .pi-qty {
    font-size: 0.72em;
    color: rgba(232, 228, 210, 0.45);
    margin-left: auto;
    font-weight: 500;
    font-family: var(--font-mono);
  }
</style>
