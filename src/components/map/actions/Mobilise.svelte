<script>
  import { apiPost } from '../../../lib/api.js';

  // Import unit definitions to get boat capacities
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import Checkbox from '../../ui/Checkbox.svelte';
  import UnitIcon from '../../icons/UnitIcon.svelte';

  import { currentPlayer, game, timeUntilNextTick } from '../../../lib/stores/game';
  import { targetStore, entities } from '../../../lib/stores/map';

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

  // The player's character entity on this tile. Entities are keyed by lifeId
  // and carry `uid`, so "mine" means uid match; the entity id is the lifeId we
  // mobilise.
  const myEntity = $derived(
    Array.isArray(tileData?.players)
      ? tileData.players.find(p => p.uid === $currentPlayer?.id)
      : Object.values(tileData?.players || {}).find(p => p.uid === $currentPlayer?.id)
  );
  const myLifeId = $derived(myEntity?.id ?? $currentPlayer?.lifeId ?? null);

  function isPlayerOnTile(tile, uid) {
    if (!tile || !tile.players) return false;
    const list = Array.isArray(tile.players) ? tile.players : Object.values(tile.players);
    return list.some(p => p.uid === uid);
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
        lifeId: myLifeId,
        name: groupName,
        fleeAtLosses,
        joinBattlesInProgress,
        race: $currentPlayer?.race
      });

      console.log('Mobilization result:', result);
      mobilizeSuccess = true; // Set success state

      // Optimistic update — no chunk_update is broadcast until the next world
      // tick, so reflect the new mobilizing group locally. This drops the
      // player off the tile (so Mobilise leaves the action wheel) and surfaces
      // the group's 'mobilizing' status in the dossier/details immediately.
      const tileKey = `${tileData.x},${tileData.y}`;
      const newGroupId = result?.groupId || `group_optimistic_${Date.now()}`;
      const optimisticUnits = {};
      for (const u of selectedUnits) optimisticUnits[u.id] = { ...u };
      if (includePlayer && $currentPlayer && myLifeId) {
        optimisticUnits[myLifeId] = {
          id: myLifeId,
          uid: $currentPlayer.id,
          type: 'player',
          race: $currentPlayer.race,
          displayName: $currentPlayer.displayName
        };
      }
      const optimisticGroup = {
        id: newGroupId,
        name: groupName.trim(),
        owner: $currentPlayer?.id,
        status: 'mobilizing',
        x: tileData.x,
        y: tileData.y,
        race: $currentPlayer?.race || null,
        units: optimisticUnits
      };
      entities.update(current => {
        const groups = { ...current.groups };
        const players = { ...current.players };
        groups[tileKey] = [...(groups[tileKey] || []), optimisticGroup];
        if (includePlayer && $currentPlayer && myLifeId) {
          players[tileKey] = (players[tileKey] || []).filter(p => p.id !== myLifeId);
        }
        return { ...current, groups, players };
      });

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
    ((selectedUnits.length > 0) || (includePlayer && !!myEntity))
    && !capacityExceeded // Add capacity check
  );

  // Rule-of-march (flee at losses, join battles) only matters for a real force.
  // When the only thing being mobilised is the player alone there are no losses
  // to flee from, so the section is hidden and a default threshold is kept.
  let mobilisingPlayerOnly = $derived(
    selectedUnits.length === 0 && includePlayer && !!myEntity
  );

  // Group the selected units by kind for the summary, so it shows an icon and a
  // count per unit type (e.g. "2 Footman") rather than a bare total. The player
  // is appended separately below when included.
  let summaryUnits = $derived((() => {
    const byKind = new Map();
    for (const u of selectedUnits) {
      const key = u.unitId || u.type;
      const qty = u.quantity ?? 1;
      const existing = byKind.get(key);
      if (existing) {
        existing.count += qty;
      } else {
        byKind.set(key, {
          key,
          count: qty,
          name: u.name || UNITS[u.unitId]?.name || UNITS[u.type]?.name || _fmt(key)
        });
      }
    }
    return [...byKind.values()];
  })());

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
             allowed to join battles in progress. Hidden when mobilising the
             player alone, since a lone unit has no losses to flee from. -->
        {#if !mobilisingPlayerOnly}
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
        {/if}
        
        <div class="options">
          <!-- Only offer the choice when there are other units to mobilise. If the
               player is the only unit available, including them is assumed. -->
          {#if myEntity && availableUnits.length > 0}
            <div class="option-row">
              <Checkbox bind:checked={includePlayer} label="Include yourself in mobilization" id="include-player" />
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
                    <UnitIcon type={unit.unitId || unit.type} size="1.5em" extraClass="race-icon-small" />
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
          {#if summaryUnits.length > 0 || (includePlayer && myEntity)}
            <div class="summary-units">
              {#if includePlayer && myEntity}
                <span class="summary-unit">
                  <UnitIcon type="player" size="1.2em" extraClass="summary-unit-icon" />
                  <span class="summary-unit-name">You</span>
                </span>
              {/if}
              {#each summaryUnits as su (su.key)}
                <span class="summary-unit">
                  <UnitIcon type={su.key} size="1.2em" extraClass="summary-unit-icon" />
                  <span class="summary-unit-count">{su.count}×</span>
                  <span class="summary-unit-name">{su.name}</span>
                </span>
              {/each}
            </div>
          {:else}
            <p>No units selected.</p>
          {/if}
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
            {processing ? 'Processing...' : 'Mobilise Force'}
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
    color: var(--color-gold-pale);
  }

  :global(.race-icon-small) {
    color: var(--color-gold-pale);
    flex-shrink: 0;
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

  .summary-units {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }

  .summary-unit {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    padding: 0.25em 0.55em;
    background: rgba(176, 141, 74, 0.1);
    border: 0.075em solid rgba(176, 141, 74, 0.25);
    font-size: 0.85em;
    color: var(--color-parchment-100);
  }

  :global(.summary-unit-icon) {
    color: var(--color-gold-pale);
    flex-shrink: 0;
  }

  .summary-unit-count {
    font-family: var(--font-mono, monospace);
    color: var(--color-aged-gold);
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
