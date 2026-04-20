<script>
  import { scale } from 'svelte/transition';
  import { apiPost } from '../../../lib/api.js';
  import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import { EQUIPMENT_SLOTS, SLOT_ORDER } from 'gisaima-shared/definitions/EQUIPMENT_SLOTS.js';
  import { game, currentPlayer } from '../../../lib/stores/game.js';
  import Close from '../../icons/Close.svelte';
  import Race from '../../icons/Race.svelte';
  import Unit from '../../icons/Unit.svelte';

  const {
    unit,
    unitId,
    group,
    tileData,
    onClose  = () => {},
    onEquipped = () => {},   // called after a successful equip/unequip so parent can refresh
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
    if (def.meleeAttack !== undefined) {
      return {
        meleeAtk: (def.meleeAttack || 0) * sf,
        rangedAtk: (def.rangedAttack || 0) * sf,
        magicAtk:  (def.magicAttack  || 0) * sf,
        meleeDef:  (def.meleeDefense  || 0) * sf,
        rangedDef: (def.rangedDefense || 0) * sf,
        magicDef:  (def.magicDefense  || 0) * sf,
      };
    }
    const p = (def.power || 1) * sf;
    return { meleeAtk: p, rangedAtk: 0, magicAtk: 0, meleeDef: 1 * sf, rangedDef: 1 * sf, magicDef: 1 * sf };
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

<div
  class="unit-details-modal"
  role="dialog"
  tabindex="-1"
  transition:scale={{ start: 0.95, duration: 200 }}
>
  <header class="modal-header">
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
          {#if unit.id === $currentPlayer?.id}
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
    <button class="close-btn" onclick={onClose}><Close size="1.4em" /></button>
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
                    {itemDef.stats?.attack ? '⚔️' : itemDef.stats?.defense ? '🛡️' : slotDef.icon}
                  </div>
                  <div class="slot-item-name">{itemDef.name}</div>
                {:else}
                  <div class="slot-empty-icon">{slotDef.icon}</div>
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
        <button class="close-btn small" onclick={closePicker}><Close size="1em" /></button>
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
                {#if def.power}          <span class="pi-stat pwr">PWR {def.power}</span>{/if}
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
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 30em;
    max-height: 90vh;
    background: white;
    border-radius: 0.5em;
    box-shadow: 0 0.5em 2em rgba(0, 0, 0, 0.3);
    overflow: hidden;
    z-index: 1100;
    display: flex;
    flex-direction: column;
    font-family: var(--font-body);
    text-shadow: none;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7em 0.9em;
    background: rgba(0, 0, 0, 0.04);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    gap: 0.5em;
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
    color: rgba(0, 0, 0, 0.85);
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
    border-radius: 0.3em;
    font-weight: 500;
    white-space: nowrap;
  }
  .you-badge   { background: rgba(76, 175, 80, 0.2); color: #2e7d32; border: 1px solid rgba(76, 175, 80, 0.4); }
  .race-badge  { background: rgba(33, 150, 243, 0.15); color: #0277bd; border: 1px solid rgba(33, 150, 243, 0.3); }
  .type-badge  { background: rgba(0, 0, 0, 0.07); color: rgba(0, 0, 0, 0.6); }
  .lv-badge    { background: rgba(156, 39, 176, 0.15); color: #7b1fa2; border: 1px solid rgba(156, 39, 176, 0.3); }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25em;
    display: flex;
    border-radius: 50%;
    transition: background-color 0.2s;
    flex-shrink: 0;
  }
  .close-btn:hover { background: rgba(0, 0, 0, 0.08); }
  .close-btn.small { padding: 0.1em; }

  .stats-section {
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .stats-row {
    display: flex;
    gap: 0;
  }

  .atk-row {
    background: rgba(244, 67, 54, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  .def-row {
    background: rgba(33, 150, 243, 0.03);
  }

  .stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4em 0.25em;
    border-right: 1px solid rgba(0, 0, 0, 0.06);
  }
  .stat:last-child { border-right: none; }

  .carry-stat { flex: 1; }

  .stat-label {
    font-size: 0.62em;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(0, 0, 0, 0.4);
    font-weight: 600;
    white-space: nowrap;
  }

  .stat-value {
    font-size: 0.95em;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.8);
  }

  .atk-val { color: rgba(198, 40, 40, 0.85); }
  .def-val { color: rgba(2, 119, 189, 0.85); }
  .carry-val { color: rgba(0, 0, 0, 0.65); }

  .stat-bonus {
    font-size: 0.65em;
    color: rgba(76, 175, 80, 0.9);
    font-weight: 600;
  }

  .error-bar {
    padding: 0.5em 0.9em;
    background: rgba(244, 67, 54, 0.1);
    color: #c62828;
    font-size: 0.85em;
    border-bottom: 1px solid rgba(244, 67, 54, 0.2);
  }

  .equip-section {
    padding: 0.7em 0.9em;
    overflow-y: auto;
    flex: 1;
  }

  .equip-label {
    font-size: 0.7em;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: rgba(0, 0, 0, 0.45);
    font-weight: 700;
    margin-bottom: 0.6em;
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
    background: rgba(0, 0, 0, 0.03);
    border: 1px dashed rgba(0, 0, 0, 0.18);
    border-radius: 0.3em;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    text-align: center;
    gap: 0.25em;
  }

  .equip-slot:hover {
    background: rgba(66, 133, 244, 0.06);
    border-color: rgba(66, 133, 244, 0.4);
  }

  .equip-slot.occupied {
    background: rgba(66, 133, 244, 0.08);
    border: 1px solid rgba(66, 133, 244, 0.35);
  }

  .equip-cell-empty {
    min-height: 4.5em;
  }

  .slot-empty-icon {
    font-size: 1.4em;
    opacity: 0.35;
  }

  .slot-label {
    font-size: 0.65em;
    color: rgba(0, 0, 0, 0.4);
    font-weight: 500;
  }

  .slot-item-icon {
    font-size: 1.3em;
  }

  .slot-item-name {
    font-size: 0.62em;
    color: rgba(0, 0, 0, 0.75);
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
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.25);
    color: #c62828;
    font-size: 0.55em;
    padding: 0.1em 0.3em;
    border-radius: 0.2em;
    cursor: pointer;
    line-height: 1;
    transition: all 0.15s;
    font-family: inherit;
  }

  .slot-unequip:hover { background: rgba(244, 67, 54, 0.2); }
  .slot-unequip:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Picker panel */
  .picker-panel {
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(248, 250, 255, 1);
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
    color: rgba(0, 0, 0, 0.75);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: rgba(0, 0, 0, 0.03);
  }

  .source-tabs, .storage-tabs {
    display: flex;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .src-tab, .stor-tab {
    flex: 1;
    background: none;
    border: none;
    padding: 0.35em 0.5em;
    font-size: 0.78em;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    border-bottom: 2px solid transparent;
  }
  .src-tab:hover, .stor-tab:hover { color: rgba(0, 0, 0, 0.8); }
  .src-tab.active, .stor-tab.active {
    color: rgba(66, 133, 244, 0.9);
    border-bottom-color: rgba(66, 133, 244, 0.7);
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
    color: rgba(0, 0, 0, 0.4);
    font-size: 0.85em;
    font-style: italic;
  }

  .picker-item {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
    padding: 0.55em 0.7em;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.3em;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: all 0.15s;
  }
  .picker-item:hover:not(:disabled) {
    background: rgba(66, 133, 244, 0.06);
    border-color: rgba(66, 133, 244, 0.3);
  }
  .picker-item:disabled { opacity: 0.6; cursor: not-allowed; }

  .pi-name {
    font-weight: 600;
    font-size: 0.9em;
    color: rgba(0, 0, 0, 0.85);
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
    border-radius: 0.25em;
    font-weight: 600;
    white-space: nowrap;
  }
  .pi-stat.atk { background: rgba(244, 67, 54, 0.1);  color: #c62828; }
  .pi-stat.def { background: rgba(33, 150, 243, 0.1);  color: #0277bd; }
  .pi-stat.spd { background: rgba(76, 175, 80, 0.1);   color: #2e7d32; }
  .pi-stat.pwr { background: rgba(156, 39, 176, 0.1);  color: #7b1fa2; }

  .pi-qty {
    font-size: 0.72em;
    color: rgba(0, 0, 0, 0.45);
    margin-left: auto;
    font-weight: 500;
  }
</style>
