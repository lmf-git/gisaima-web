<script>
  import { apiPost } from '../../../lib/api.js';

  // Import unit definitions to get boat capacities
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import Checkbox from '../../ui/Checkbox.svelte';

  import { currentPlayer, game, timeUntilNextTick } from '../../../lib/stores/game';
  import { targetStore } from '../../../lib/stores/map';

  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';

  const {
    onClose = () => {},
  } = $props();

  let tileData = $derived($targetStore || null);

  const _fmt = t => t?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  let groupName = $state("");
  let includePlayer = $state(true);

  let availableUnits = $state([]);
  let selectedUnits = $state([]);

  let mobilizeError = $state(null);
  let processing = $state(false);
  let mobilizeSuccess = $state(false);

  // Rule-of-march settings — captured here so they attach to the new group
  // on raise. They round-trip with the action payload so the tick can read them.
  let fleeAtLosses = $state(40);          // 0..100 (%)
  let joinBattlesInProgress = $state(false);

  // Set default group name when component loads, based on player's name
  $effect(() => {
    if ($currentPlayer?.displayName) {
      groupName = `${$currentPlayer.displayName}'s Force`;
    } else {
      groupName = "New Force";
    }
  });

  function isPlayerOnTile(tile, playerId) {
    if (!tile || !tile.players) return false;
    
    if (Array.isArray(tile.players)) {
      return tile.players.some(p => p.id === playerId);
    } else if (typeof tile.players === 'object') {
      return Object.values(tile.players).some(p => p.id === playerId);
    }
    
    return false;
  }

  $effect(() => {
    if (!tileData) return;
    
    const units = [];
    const playerId = $currentPlayer?.id;
    
    if (tileData.groups && tileData.groups.length > 0) {
      tileData.groups.forEach(group => {
        if (group.owner === playerId && group.status !== 'mobilizing' && group.status !== 'moving') {
          if (group.units) {
            group.units.forEach(unit => {
              if (unit.type !== 'player') {
                units.push({
                  ...unit,
                  group: group.name || group.id,
                  selected: false
                });
              }
            });
          }
        }
      });
    }
    
    if (!$currentPlayer) {
      mobilizeError = 'You need to be logged in to mobilise units.';
      return;
    }
    
    if (!isPlayerOnTile(tileData, $currentPlayer.id)) {
      console.warn('Player not found on tile. Players data:', tileData.players);
      mobilizeError = 'Player not found on this tile.';
      return;
    }
    
    includePlayer = isPlayerOnTile(tileData, playerId);
    availableUnits = units;
  });
  
  // Add new state variables for boat tracking
  let selectedBoatUnits = $state([]);
  let totalBoatCapacity = $state(0);
  let nonBoatUnitCount = $state(0);
  let capacityExceeded = $state(false);
  

  
  // Function to check if a unit is a boat
  function isBoatUnit(unit) {
    if (!unit || !unit.type) return false;
    return UNITS[unit.type]?.motion?.includes('water') && UNITS[unit.type]?.capacity > 0;
  }
  
  // Calculate total boat capacity and non-boat unit count
  function updateBoatCapacityInfo() {
    selectedBoatUnits = availableUnits.filter(u => u.selected && isBoatUnit(u));
    
    totalBoatCapacity = selectedBoatUnits.reduce((total, boat) => {
      const unitDef = UNITS[boat.type];
      return total + (unitDef?.capacity || 0);
    }, 0);
    
    nonBoatUnitCount = availableUnits.filter(u => u.selected && !isBoatUnit(u)).length;
    
    if (includePlayer && !isPlayerInBoat()) {
      nonBoatUnitCount += 1; // Count the player as well if they're not already in a boat
    }
    
    capacityExceeded = totalBoatCapacity > 0 && nonBoatUnitCount > totalBoatCapacity;
  }
  
  // Check if player is already included in a boat
  function isPlayerInBoat() {
    return false; // This would need implementation based on your data structure
  }
  
  // Override the toggleUnit function to handle capacity limits
  function toggleUnit(unitId) {
    const unit = availableUnits.find(u => u.id === unitId);
    
    // If trying to select a non-boat unit but capacity is full
    if (unit && !isBoatUnit(unit) && !unit.selected) {
      if (totalBoatCapacity > 0 && nonBoatUnitCount >= totalBoatCapacity) {
        mobilizeError = "Cannot add more units: boat capacity exceeded";
        return;
      }
    }
    
    availableUnits = availableUnits.map(unit => {
      if (unit.id === unitId) {
        return { ...unit, selected: !unit.selected };
      }
      return unit;
    });
    
    selectedUnits = availableUnits.filter(u => u.selected);
    updateBoatCapacityInfo();
  }

  function handleUnitKeyDown(event, unitId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleUnit(unitId);
    }
  }
  
  async function startMobilization() {
    if (mobilizeError || (selectedUnits.length === 0 && !includePlayer)) {
      return;
    }
    
    if (capacityExceeded) {
      mobilizeError = "Cannot mobilize: boat capacity exceeded";
      return;
    }

    mobilizeError = null;
    processing = true;
    mobilizeSuccess = false; // Reset success state
    
    try {
      console.log("Preparing mobilization request with:", {
        worldId: $game.worldKey,
        tileX: tileData.x,
        tileY: tileData.y,
        units: selectedUnits.map(u => u.id),
        includePlayer,
        name: groupName,
        fleeAtLosses,
        joinBattlesInProgress,
        race: $currentPlayer?.race
      });

      const result = await apiPost('/actions/mobiliseUnits', {
        worldId: $game.worldKey,
        tileX: tileData.x,
        tileY: tileData.y,
        units: selectedUnits.map(u => u.id),
        includePlayer,
        name: groupName,
        fleeAtLosses,
        joinBattlesInProgress,
        race: $currentPlayer?.race
      });

      console.log('Mobilization result:', result);
      mobilizeSuccess = true; // Set success state
      
      onClose();
    } catch (error) {
      console.error('Error during mobilization:', error);
      if (error.code === 'unauthenticated') {
         mobilizeError = 'Authentication error: Please log in again.';
      } else {
         mobilizeError = error.message || "Failed to mobilise forces";
      }
      mobilizeSuccess = false;
    } finally {
      processing = false;
    }
  }
  
  let canMobilize = $derived(
    ((selectedUnits.length > 0) || 
    (includePlayer && (
      Array.isArray(tileData?.players)
        ? tileData.players.some(p => p.id === $currentPlayer?.id || p.id === $currentPlayer?.id)
        : tileData?.players && (
            tileData.players[$currentPlayer?.id] !== undefined || 
            Object.values(tileData.players).some(p => p.id === $currentPlayer?.id || p.id === $currentPlayer?.id)
          )
    ))) 
    && !capacityExceeded // Add capacity check
  );

  function toggleCheckbox() {
    includePlayer = !includePlayer;
  }
</script>

<div
  class="mobilise-modal">

  <div class="content">
    {#if tileData}
      <div class="location-info">
        <div class="terrain">
          <div class="terrain-color" style="background-color: {tileData.color}"></div>
          <span>{_fmt(tileData.biome?.name) || "Unknown"}</span>
          
          {#if tileData.structure}
            <span class="structure-tag">
              {tileData.structure.name || _fmt(tileData.structure.type)}
            </span>
          {/if}
        </div>
      </div>
      
      <div class="mobilise-content">
        <div class="group-details">
          <div class="group-name-row">
            <label for="group-name">Group Name:</label>
            <input
              type="text"
              id="group-name"
              bind:value={groupName}
              placeholder="Enter group name"
              class="text-input"
              onkeydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}
            />
          </div>
        </div>

        <!-- Rule of march — retreat threshold + whether the new banner is
             allowed to join battles in progress. -->
        <div class="rule-of-march">
          <div class="row-of-march eyebrow">Rule of march</div>
          <label class="march-row">
            <span>Flee at losses · <b>{fleeAtLosses}%</b></span>
            <input type="range" min="0" max="100" bind:value={fleeAtLosses} />
          </label>
          <div class="march-row toggle">
            <span>Join battles in progress</span>
            <Checkbox bind:checked={joinBattlesInProgress} />
          </div>
        </div>
        
        <div class="options">
          {#if Array.isArray(tileData?.players)
              ? tileData.players.some(p => p.id === $currentPlayer?.id || p.id === $currentPlayer?.id)
              : tileData?.players && (
                  tileData.players[$currentPlayer?.id] !== undefined || 
                  Object.values(tileData.players).some(p => p.id === $currentPlayer?.id || p.id === $currentPlayer?.id)
                )}
            <div class="option-row">
              <Checkbox bind:checked={includePlayer} label="Include yourself in mobilization" id="include-player" onchange={toggleCheckbox} />
            </div>
          {/if}
          
          <div class="mobilization-info">
            <p>
              Selected units will form a new group at this location.
              <br>
              Mobilization will complete on the next world update
              <span class="next-tick-time">({$timeUntilNextTick})</span>
            </p>
          </div>
        </div>
        
        {#if selectedBoatUnits.length > 0}
          <div class="boat-capacity-section">
            <h3>Boat Capacity</h3>
            <div class="capacity-bar">
              <div 
                class="capacity-fill" 
                style="width: {Math.min(nonBoatUnitCount / totalBoatCapacity * 100, 100)}%"
                class:capacity-exceeded={capacityExceeded}
              ></div>
            </div>
            <div class="capacity-text">
              {nonBoatUnitCount} / {totalBoatCapacity} units
              {#if capacityExceeded}
                <span class="capacity-warning">Capacity exceeded!</span>
              {/if}
            </div>
            <p class="capacity-info">
              Your selected boats can carry up to {totalBoatCapacity} units.
              {#if capacityExceeded}
                Please remove {nonBoatUnitCount - totalBoatCapacity} {nonBoatUnitCount - totalBoatCapacity > 1 ? 'units' : 'unit'} or add more boats.
              {/if}
            </p>
          </div>
        {/if}
        
        {#if mobilizeError}
          <div class="mobilise-error">
            {mobilizeError}
          </div>
        {/if}
        
        {#if mobilizeSuccess}
          <div class="mobilise-success">
            <p>Mobilization successful!</p>
            <button class="close-now-btn" onclick={onClose}>
              Close
            </button>
          </div>
        {/if}
        
        {#if availableUnits.length > 0}
          <div class="units-section">
            <h3>Available Units</h3>
            <div class="units-list">
              {#each availableUnits as unit}
                {@const uDef = UNITS[unit.unitId] || UNITS[unit.type]}
                <div
                  class="unit-item"
                  class:selected={unit.selected}
                  class:boat-unit={isBoatUnit(unit)}
                  onclick={() => toggleUnit(unit.id)}
                  onkeydown={(e) => handleUnitKeyDown(e, unit.id)}
                  role="button"
                  tabindex="0"
                  aria-pressed={unit.selected}
                  aria-label={`Select ${unit.name || unit.id}`}
                >
                  <Checkbox checked={unit.selected} />
                  <div class="unit-icon">
                    {#if unit.race}
                      {#if unit.race.toLowerCase() === 'human'}
                        <Human extraClass="race-icon-small" />
                      {:else if unit.race.toLowerCase() === 'elf'}
                        <Elf extraClass="race-icon-small" />
                      {:else if unit.race.toLowerCase() === 'dwarf'}
                        <Dwarf extraClass="race-icon-small" />
                      {:else if unit.race.toLowerCase() === 'goblin'}
                        <Goblin extraClass="race-icon-small" />
                      {:else if unit.race.toLowerCase() === 'fairy'}
                        <Fairy extraClass="race-icon-small" />
                      {/if}
                    {/if}
                  </div>
                  <div class="unit-info">
                    <div class="unit-name">
                      {unit.name || unit.id}
                      {#if isBoatUnit(unit)}
                        <span class="boat-capacity-tag">
                          Capacity: {UNITS[unit.type]?.capacity || "?"}
                        </span>
                      {/if}
                    </div>
                    <div class="unit-details">
                      {#if unit.race}
                        <span class="race-tag">{_fmt(unit.race)}</span>
                      {/if}
                      {#if uDef}
                        {#if (uDef.meleeAttack||0) > 0}<span class="stat-tag melee-tag">M·{uDef.meleeAttack.toFixed(1)}</span>{/if}
                        {#if (uDef.rangedAttack||0) > 0}<span class="stat-tag ranged-tag">R·{uDef.rangedAttack.toFixed(1)}</span>{/if}
                        {#if (uDef.magicAttack||0) > 0}<span class="stat-tag magic-tag">Mg·{uDef.magicAttack.toFixed(1)}</span>{/if}
                      {/if}
                      {#if unit.group}
                        <span class="group-tag">From: {unit.group}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="no-units">
            <p>You have no units that can be mobilized at this location.</p>
          </div>
        {/if}
        
        <div class="summary">
          <h3>Summary</h3>
          <p>
            Units selected: {selectedUnits.length}
            {#if selectedBoatUnits.length > 0}
              (including {selectedBoatUnits.length} {selectedBoatUnits.length > 1 ? 'boats' : 'boat'})
            {/if}
            {#if includePlayer && tileData?.players?.some(p => p.id === $currentPlayer?.id)}
              + You
            {/if}
          </p>
          {#if selectedBoatUnits.length > 0}
            <p class="transport-note">
              This group will be water-based and can only traverse water tiles.
            </p>
          {/if}
        </div>
        
        <div class="button-row">
          <button 
            class="cancel-btn" 
            onclick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button 
            class="mobilise-btn" 
            disabled={!canMobilize || processing}
            onclick={startMobilization}
          >
            {processing ? 'Processing...' : 'Mobilise Forces'}
          </button>
        </div>
      </div>
    {:else}
      <p class="no-tile">No tile selected</p>
    {/if}
  </div>
</div>

<style>
  .rule-of-march {
    margin: 0.6em 0 0.8em;
    padding: 0.7em 0.9em;
    background: rgba(176, 141, 74, 0.06);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }
  .row-of-march {
    font-family: var(--font-display);
    font-size: 0.65em;
    letter-spacing: 0.22em;
    color: var(--color-gold-pale);
    margin-bottom: 0.5em;
  }
  .march-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6em;
    padding: 0.3em 0;
    font-family: var(--font-mono);
    font-size: 0.85em;
    color: var(--color-parchment-200);
  }
  .march-row.toggle {
    font-family: var(--font-display);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 0.75em;
  }
  .march-row select {
    padding: 0.3em 0.6em;
    font-family: var(--font-display);
    font-size: 0.85em;
    background: rgba(14, 19, 32, 0.6);
    color: var(--color-parchment-100);
    border: 0.075em solid rgba(176, 141, 74, 0.4);
  }
  .march-row input[type="range"] { flex: 1; }
  .march-row b { color: var(--color-wax-red); }

  .mobilise-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  .content {
    padding: 1em;
    overflow-y: auto;
    flex: 1;
    color: var(--color-parchment-200);
  }

  .location-info {
    padding-bottom: 1em;
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
    margin-bottom: 1em;
  }

  .terrain {
    display: flex;
    align-items: center;
    font-size: 1.1em;
    color: var(--color-parchment-200);
  }

  .terrain-color {
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .structure-tag {
    margin-left: 0.8em;
    font-size: 0.8em;
    font-weight: bold;
    padding: 0.2em 0.5em;
    background: rgba(176, 141, 74, 0.1);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    color: var(--color-gold-pale);
  }

  .mobilise-content {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .group-details {
    padding-bottom: 1em;
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .group-name-row {
    display: flex;
    align-items: center;
    gap: 1em;
    width: 100%;
  }

  .group-name-row label {
    font-weight: 500;
    min-width: 6em;
    color: var(--color-parchment-200);
  }

  .text-input {
    flex: 1;
    padding: 0.7em;
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    font-family: var(--font-body);
    font-size: 0.95em;
    background-color: rgba(26, 32, 48, 0.7);
    transition: border-color 0.2s;
    color: var(--color-parchment-200);
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-aged-gold);
  }

  .visually-hidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }

  .custom-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5em;
    cursor: pointer;
    user-select: none;
  }

  .custom-checkbox {
    width: 1.2em;
    height: 1.2em;
    border: 0.075em solid rgba(176, 141, 74, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
    background-color: rgba(26, 32, 48, 0.55);
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
  }

  .custom-checkbox:focus {
    outline: none;
    border-color: var(--color-aged-gold);
  }

  .custom-checkbox.checked {
    background-color: var(--color-aged-gold);
    border-color: var(--color-aged-gold);
  }

  .checkbox-icon {
    width: 100%;
    height: 100%;
    fill: var(--color-ink-900);
  }

  .checkbox-text {
    color: var(--color-parchment-100);
    font-weight: 500;
  }

  .units-section {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    max-height: 30vh;
    overflow-y: auto;
    padding: 0.5em 0;
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .units-list {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .unit-item {
    display: flex;
    align-items: center;
    padding: 0.6em 0.8em;
    border: 0.075em solid rgba(176, 141, 74, 0.15);
    cursor: pointer;
    transition: background-color 0.2s;
    background-color: rgba(176, 141, 74, 0.05);
  }

  .unit-item:hover {
    background-color: rgba(176, 141, 74, 0.1);
  }

  .unit-item.selected {
    background-color: rgba(176, 141, 74, 0.14);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .unit-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 0.6em;
  }

  .unit-info {
    flex: 1;
  }

  .unit-name {
    font-weight: 500;
    margin-bottom: 0.2em;
    color: var(--color-parchment-100);
  }

  .unit-details {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    font-size: 0.8em;
  }

  .race-tag, .group-tag {
    padding: 0.1em 0.4em;
    background-color: rgba(176, 141, 74, 0.08);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    color: var(--color-parchment-200);
  }

  .stat-tag {
    padding: 0.1em 0.4em;
    background-color: rgba(176, 141, 74, 0.08);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }
  .melee-tag { background-color: rgba(91, 26, 31, 0.12); border-color: rgba(91, 26, 31, 0.28); }
  .ranged-tag { background-color: rgba(40, 70, 40, 0.14); border-color: rgba(60, 110, 60, 0.28); }
  .magic-tag { background-color: rgba(50, 40, 90, 0.18); border-color: rgba(90, 70, 160, 0.3); }

  .group-tag {
    color: var(--color-parchment-200);
    background-color: rgba(176, 141, 74, 0.08);
  }

  .summary {
    margin-top: 1em;
    padding: 1em;
    background-color: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    color: var(--color-parchment-100);
  }

  .summary h3 {
    margin: 0 0 0.5em 0;
    font-size: 0.85em;
    font-family: var(--font-display);
    color: var(--color-aged-gold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .summary p {
    margin: 0;
    font-weight: 500;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
    padding-top: 1em;
    border-top: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .option-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 0.6em;
  }

  .mobilization-info {
    padding: 0.8em;
    background-color: rgba(176, 141, 74, 0.05);
    font-size: 0.9em;
    color: var(--color-parchment-200);
    line-height: 1.4;
    margin: 0.5em 0;
    border-left: 3px solid rgba(176, 141, 74, 0.4);
  }

  .mobilization-info p {
    margin: 0;
  }

  .next-tick-time {
    font-family: var(--font-mono, monospace);
    font-weight: 500;
    color: var(--color-gold-pale);
  }

  .mobilise-error {
    background-color: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.4);
    color: #ff5757;
    padding: 0.8em;
    margin: 1em 0;
    font-size: 0.9em;
  }

  .mobilise-success {
    background-color: rgba(63, 90, 78, 0.22);
    border: 0.075em solid rgba(76, 175, 80, 0.3);
    color: #4caf50;
    padding: 0.8em;
    margin: 1em 0;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .close-now-btn {
    background: none;
    border: none;
    color: #4caf50;
    font-weight: 500;
    cursor: pointer;
    padding: 0.4em 0.8em;
    transition: background-color 0.2s;
  }

  .close-now-btn:hover {
    background-color: rgba(63, 90, 78, 0.35);
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    gap: 0.8em;
    margin-top: 1.5em;
  }

  .cancel-btn, .mobilise-btn {
    padding: 0.7em 1.2em;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.2s;
    border: 0;
  }

  .cancel-btn {
    background: transparent;
    color: var(--color-parchment-200);
    border: 0.075em solid rgba(176, 141, 74, 0.35);
  }

  .cancel-btn:hover {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .mobilise-btn {
    background-color: var(--color-aged-gold);
    color: var(--color-ink-900);
  }

  .mobilise-btn:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .mobilise-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .no-units, .no-tile {
    text-align: center;
    padding: 2em 0;
    color: rgba(232, 228, 210, 0.55);
    font-style: italic;
  }

  h3 {
    margin: 0 0 0.8em 0;
    font-size: 0.8em;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .boat-capacity-section {
    background-color: rgba(176, 141, 74, 0.05);
    padding: 0.8em;
    margin: 0.5em 0 1em;
    border: 0.075em solid rgba(176, 141, 74, 0.2);
  }

  .capacity-bar {
    height: 0.6em;
    background-color: rgba(176, 141, 74, 0.12);
    margin: 0.5em 0;
    overflow: hidden;
  }

  .capacity-fill {
    height: 100%;
    background-color: var(--color-aged-gold);
    transition: width 0.3s ease;
  }

  .capacity-fill.capacity-exceeded {
    background-color: #f44336;
  }

  .capacity-text {
    font-size: 0.9em;
    color: var(--color-parchment-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .capacity-warning {
    color: #f44336;
    font-weight: 500;
  }

  .capacity-info {
    margin-top: 0.5em;
    font-size: 0.85em;
    color: rgba(232, 228, 210, 0.65);
  }

  .boat-unit {
    border-left: 3px solid var(--color-gold-pale);
  }

  .boat-capacity-tag {
    font-size: 0.75em;
    padding: 0.1em 0.4em;
    background-color: rgba(176, 141, 74, 0.1);
    color: var(--color-gold-pale);
    margin-left: 0.5em;
  }

  .transport-note {
    margin-top: 0.5em;
    font-size: 0.85em;
    color: var(--color-gold-pale);
    font-style: italic;
  }

  @media (max-width: 480px) {
    .group-name-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5em;
    }

    .button-row {
      flex-direction: column;
    }

    .button-row button {
      width: 100%;
    }
  }
</style>
