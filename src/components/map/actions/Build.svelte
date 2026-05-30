<script>
  import { STRUCTURES } from 'gisaima-shared/definitions/STRUCTURES.js';
  import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
  import { BUILDINGS } from 'gisaima-shared/definitions/BUILDINGS.js';

  import StructureIcon from '../../icons/StructureIcon.svelte';

  import { currentPlayer, timeUntilNextTick } from '../../../lib/stores/game';
  import { targetStore, coordinates } from '../../../lib/stores/map';

  const {
    onClose = () => {},
    onBuild = () => {},
  } = $props();

  let tileData = $derived($targetStore || null);

  // Add state for water validation error
  let waterValidationError = $state(null);

  const _fmt = t => {
    if (typeof t !== 'string') return t || '';
    return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Transform resource names to UI-friendly format
  const formatResourceName = (resourceId) => {
    // Look up the item name from ITEMS using the resource ID
    if (ITEMS[resourceId]) {
      return ITEMS[resourceId].name;
    }
    
    // Fallback formatting for unknown resources
    return _fmt(resourceId);
  };
  
  // Transform STRUCTURES object into the format expected by the UI
  const transformStructures = () => {
    return Object.entries(STRUCTURES)
      .filter(([id, structure]) => !structure.monster && id !== 'spawn') // Filter out monster structures and spawn
      .map(([id, structure]) => ({
        id,
        name: structure.name,
        description: structure.description,
        requiredResources: structure.requiredResources.map(resource => ({
          // Use the ID to look up the name
          name: formatResourceName(resource.id),
          quantity: resource.quantity,
          type: 'resource',
          id: resource.id // Keep the ID for reference
        })),
        buildTime: structure.buildTime,
        capacity: structure.capacity || 10, // Default capacity if not specified
        durability: structure.durability || 100, // Include durability
        features: structure.features || [
          {
            name: 'Structure',
            description: 'Basic structure features',
            icon: '🏛️'
          }
        ]
      }));
  };
  
  // Available structure options from STRUCTURES.js
  let structureOptions = $state(transformStructures());

  // State variables
  let availableGroups = $state([]);
  let selectedGroup = $state(null);
  let selectedStructure = $state(null);
  let structureName = $state("");
  let buildError = $state(null);
  let availableResources = $state({});

  // Function to check if a tile is a water tile
  function isWaterTile(tile) {
    if (!tile) return false;
    
    // Check if the tile has water property from biome
    if (tile.biome && tile.biome.water) return true;
    
    // Check riverValue, lakeValue, or other water indicators
    if (tile.riverValue > 0.2 || tile.lakeValue > 0.2) return true;
    
    return false;
  }

  // Function to check if the current tile or any adjacent tile is water
  function hasAdjacentWater() {
    if (!tileData) return false;

    if (isWaterTile(tileData)) return true;

    const adjacentOffsets = [
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
      { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];

    for (const offset of adjacentOffsets) {
      const neighbour = $coordinates.find(
        c => c.x === tileData.x + offset.x && c.y === tileData.y + offset.y
      );
      if (isWaterTile(neighbour)) return true;
    }

    return false;
  }

  // Check if the selected structure is a harbour that needs water validation
  function isHarbour(structure) {
    if (!structure) return false;
    
    // Check if structure ID matches harbour or if it's flagged as requiring water
    return structure.id === 'harbour' || 
           BUILDINGS.types.harbour.id === structure.id || 
           structure.requiresWater === true;
  }

  // Set default structure name when component loads
  $effect(() => {
    if ($currentPlayer?.displayName && selectedStructure) {
      structureName = `${$currentPlayer.displayName}'s ${selectedStructure.name}`;
    }
  });

  $effect(() => {
    if (!tileData || !$currentPlayer) return;
    
    const groups = [];
    
    if (tileData.groups && tileData.groups.length > 0) {
      tileData.groups.forEach(group => {
        if (group.owner === $currentPlayer.id && group.status === 'idle') {
          groups.push({
            ...group,
            selected: false
          });
        }
      });
    }
    
    availableGroups = groups;
  });

  // Update available resources when group changes
  $effect(() => {
    if (!selectedGroup) {
      availableResources = {};
      return;
    }
    
    // Aggregate resources from the selected group
    const resources = {};
    
    // Handle the new format {item_code: quantity}
    if (!Array.isArray(selectedGroup.items) && typeof selectedGroup.items === 'object') {
      // Direct use of the object format
      Object.entries(selectedGroup.items).forEach(([itemCode, quantity]) => {
        if (!resources[itemCode]) {
          const itemDef = ITEMS[itemCode.toUpperCase()];
          resources[itemCode] = {
            name: itemDef?.name || itemCode,
            quantity: 0,
            type: itemDef?.type || 'resource',
            rarity: itemDef?.rarity || 'common'
          };
        }
        resources[itemCode].quantity += quantity;
      });
    } 
    // Handle legacy array format
    else if (selectedGroup.items && Array.isArray(selectedGroup.items)) {
      selectedGroup.items.forEach(item => {
        if (item.type === 'resource' || item.type === 'artifact') {
          if (!resources[item.id]) {
            resources[item.id] = {
              name: item.name,
              quantity: 0,
              type: item.type,
              rarity: item.rarity || 'common'
            };
          }
          resources[item.id].quantity += item.quantity || 1;
        }
      });
    }
    
    availableResources = resources;
  });
  
  // Effect to validate water requirement for harbours
  $effect(() => {
    // Reset water validation error when structure changes
    waterValidationError = null;
    
    // If a harbour is selected, validate water requirement
    if (selectedStructure && isHarbour(selectedStructure)) {
      if (!hasAdjacentWater()) {
        waterValidationError = "Harbour must be built on or adjacent to water tiles.";
      }
    }
  });
  
  function selectGroup(group) {
    selectedGroup = group;
  }

  function selectStructure(structure) {
    selectedStructure = structure;
    
    // Clear water validation error when selecting a new structure
    waterValidationError = null;
    
    // Check water requirement if selecting a harbour
    if (isHarbour(structure) && !hasAdjacentWater()) {
      waterValidationError = "Harbour must be built on or adjacent to water tiles.";
    }
    
    // Update default structure name
    if ($currentPlayer?.displayName) {
      structureName = `${$currentPlayer.displayName}'s ${structure.name}`;
    }
  }

  function handleGroupKeyDown(event, group) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectGroup(group);
    }
  }
  
  function handleStructureKeyDown(event, structure) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectStructure(structure);
    }
  }
  
  function startBuilding() {
    if (buildError || !selectedGroup || !selectedStructure || !structureName) return;

    if (isHarbour(selectedStructure) && !hasAdjacentWater()) {
      buildError = "Cannot build a harbour here. It must be on or adjacent to water.";
      return;
    }

    onBuild({
      tileX: tileData.x,
      tileY: tileData.y,
      groupId: selectedGroup.id,
      structureType: selectedStructure.id,
      structureName,
      requiresWaterEdge: isHarbour(selectedStructure)
    });
    onClose();
  }

  function hasRequiredResources() {
    if (!selectedStructure || !selectedGroup) return false;
    
    return selectedStructure.requiredResources.every(required => {
      // Try both the item ID directly and in uppercase format
      const available = 
        availableResources[required.id] || 
        availableResources[required.id.toUpperCase()];
      
      return available && available.quantity >= required.quantity;
    });
  }
  
  // Update canBuild to include water validation for harbours
  let canBuild = $derived(
    selectedGroup && 
    selectedStructure && 
    structureName && 
    hasRequiredResources() &&
    // Add water validation check
    !(isHarbour(selectedStructure) && !hasAdjacentWater())
  );
  
  function calculateBuildProgress(structure) {
    if (!structure || structure.status !== 'building') return 100;
    
    const progress = structure.buildProgress || 0;
    const total = STRUCTURES[structure.type]?.buildTime || 1;
    
    return Math.min(100, Math.floor((progress / total) * 100));
  }
  
  function calculateRemainingTime(structure) {
    if (!structure || structure.status !== 'building') return 'Complete';
    
    const progress = structure.buildProgress || 0;
    const total = STRUCTURES[structure.type]?.buildTime || 1;
    const remaining = total - progress;
    
    return `${remaining} tick${remaining !== 1 ? 's' : ''} remaining`;
  }
</script>

<div
  class="build-modal"
>
  <div class="content">
    {#if tileData}
      <div class="location-info">
        <div class="terrain">
          <div class="attribute">
            <span class="attribute-label">Type</span>
            <span class="attribute-value">
              <span class="terrain-color" style="background-color: {tileData.color || tileData.terrain?.color || '#555'}"></span>
              {_fmt(tileData.biome.name)}
            </span>
          </div>
          
          {#if tileData.structure}
            <div class="attribute">
              <span class="attribute-label">Structure</span>
              <span class="attribute-value">
                <span class="structure-tag">
                  {tileData.structure.name || _fmt(tileData.structure.type)}
                </span>
              </span>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="build-content">
        <div class="group-selection-section">
          <h3>Select a group to build</h3>
          {#if availableGroups.length > 0}
            <div class="groups-list">
              {#each availableGroups as group}
                <div 
                  class="group-item {group === selectedGroup ? 'selected' : ''}"
                  onclick={() => selectGroup(group)}
                  onkeydown={(e) => handleGroupKeyDown(e, group)}
                  tabindex="0"
                  role="button"
                  aria-pressed={group === selectedGroup}
                >
                  <div class="group-info">
                    <div class="group-name">{group.name || 'Group'}</div>
                    <div class="group-details">
                      <span class="race-tag">{_fmt(group.race || 'Unknown')}</span>
                      <span class="strength-tag">{group.units?.length || 1} units</span>
                      {#if group.items && group.items.length > 0}
                        <span class="resources-tag">{group.items.length} items</span>
                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="no-groups">No available groups on this tile. Groups must be idle to build.</p>
          {/if}
        </div>
        
        {#if selectedGroup}
          <div class="structure-selection-section">
            <h3>Select a structure to build</h3>
            <div class="structures-list">
              {#each structureOptions as structure}
                <div 
                  class="structure-item {structure === selectedStructure ? 'selected' : ''} {structure === selectedStructure && !hasRequiredResources() ? 'missing-resources' : ''}"
                  onclick={() => selectStructure(structure)}
                  onkeydown={(e) => handleStructureKeyDown(e, structure)}
                  tabindex="0"
                  role="button"
                  aria-pressed={structure === selectedStructure}
                >
                  <div class="structure-info">
                    <div class="structure-name">
                      <StructureIcon type={structure.id} size="1.3em" extraClass="structure-card-icon" />
                      {structure.name}
                    </div>
                    <div class="structure-description">{structure.description}</div>

                    <div class="structure-features">
                      {#each structure.features as feature}
                        <div class="feature">
                          <span class="feature-name">{feature.name}</span>
                        </div>
                      {/each}
                    </div>
                    
                    <div class="required-resources">
                      <div class="required-title">Required Resources:</div>
                      {#each structure.requiredResources as resource}
                        <div class="resource-requirement {availableResources[resource.id]?.quantity >= resource.quantity ? 'has-resource' : 'missing-resource'}">
                          <span class="resource-name">{resource.name}</span>
                          <span class="resource-quantity">
                            {availableResources[resource.id]?.quantity || 0}/{resource.quantity}
                          </span>
                        </div>
                      {/each}
                    </div>
                    
                    <div class="structure-stats">
                      <div class="build-time">
                        Build Time: {structure.buildTime} {structure.buildTime === 1 ? 'tick' : 'ticks'}
                      </div>
                      <div class="durability">
                        Durability: {structure.durability}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if selectedStructure && selectedGroup}
          <div class="structure-details-section">
            <h3>Structure Details</h3>
            
            <div class="group-name-row">
              <label for="structure-name">Structure Name:</label>
              <input 
                id="structure-name"
                class="text-input"
                type="text" 
                bind:value={structureName} 
                placeholder="Enter structure name" 
              />
            </div>
            
            <div class="next-tick-info">
              <div class="next-tick-time">
                Next Tick: {$timeUntilNextTick}
              </div>
              <div class="completion-time">
                Estimated Completion: {selectedStructure.buildTime} {selectedStructure.buildTime === 1 ? 'tick' : 'ticks'}
              </div>
            </div>
          </div>
        {/if}
        
        {#if selectedStructure && isHarbour(selectedStructure) && waterValidationError}
          <div class="validation-error water-error">
            <span class="error-icon">⚠️</span>
            {waterValidationError}
          </div>
        {/if}
      </div>
      
      {#if buildError}
        <div class="build-error">
          {buildError}
        </div>
      {/if}
      
      <div class="button-row">
        <button class="cancel-btn" onclick={onClose}>Cancel</button>
        <button
          class="build-btn"
          disabled={!canBuild}
          onclick={startBuilding}
        >
          Place Building
        </button>
      </div>
    {:else}
      <p class="no-tile">No tile selected</p>
    {/if}
  </div>
  
  <div class="build-status">
    {#if selectedStructure}
      <div class="progress-bar">
        <div class="progress" style="width: {calculateBuildProgress(selectedStructure)}%"></div>
      </div>
      <div class="time-remaining">
        {calculateRemainingTime(selectedStructure)}
      </div>
    {/if}
  </div>
</div>

<style>
  .build-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  /* Structure cards: show the structure's own icon beside its name. */
  .structure-name {
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  :global(.structure-card-icon) {
    flex-shrink: 0;
    color: var(--color-gold-pale, #d4b170);
  }

  .location-info {
    margin-bottom: 1em;
    background-color: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 0.8em;
  }

  .attribute {
    display: flex;
    margin-bottom: 0.6em;
    font-size: 0.9em;
    gap: 0.8em;
    align-items: flex-start;
  }

  .attribute-label {
    color: rgba(232, 228, 210, 0.65);
    font-weight: 500;
    min-width: 40px;
    flex-shrink: 0;
    font-family: var(--font-display);
    font-size: 0.85em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .attribute-value {
    flex-grow: 1;
    color: var(--color-parchment-200);
    display: flex;
    align-items: center;
  }

  .terrain-color {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-right: 0.5em;
    vertical-align: middle;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .structure-tag {
    display: inline-block;
    font-size: 0.9em;
    padding: 0.2em 0.5em;
    background: rgba(176, 141, 74, 0.1);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    color: var(--color-gold-pale);
  }

  .content {
    padding: 1em 1.5em 1.5em;
    overflow-y: auto;
    flex: 1;
    color: var(--color-parchment-200);
  }

  .build-content {
    margin-bottom: 1em;
  }

  h3 {
    margin: 0 0 0.8em 0;
    font-size: 0.8em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .group-selection-section,
  .structure-selection-section,
  .structure-details-section {
    margin-bottom: 1.2em;
    padding: 1em;
    background: rgba(176, 141, 74, 0.03);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .groups-list {
    display: flex;
    flex-direction: column;
    gap: 0.7em;
  }

  .group-item {
    display: flex;
    align-items: center;
    padding: 0.7em;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--color-parchment-100);
  }

  .group-item:hover {
    background: rgba(176, 141, 74, 0.1);
  }

  .group-item.selected {
    border-color: rgba(176, 141, 74, 0.6);
    background: rgba(176, 141, 74, 0.14);
  }

  .group-info {
    flex-grow: 1;
  }

  .group-name {
    font-weight: 600;
    font-size: 1.05em;
    margin-bottom: 0.3em;
    color: var(--color-parchment-100);
  }

  .group-details {
    display: flex;
    gap: 0.8em;
    font-size: 0.9em;
    color: var(--color-parchment-200);
  }

  .race-tag,
  .strength-tag,
  .resources-tag {
    padding: 0.2em 0.5em;
    font-size: 0.8em;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .race-tag {
    background: rgba(176, 141, 74, 0.08);
    color: var(--color-parchment-200);
  }

  .strength-tag {
    background: rgba(91, 26, 31, 0.12);
    border-color: rgba(91, 26, 31, 0.3);
    color: var(--color-parchment-200);
  }

  .resources-tag {
    background: rgba(176, 141, 74, 0.1);
    border-color: rgba(176, 141, 74, 0.3);
    color: var(--color-parchment-200);
  }

  .structures-list {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .structure-item {
    padding: 0.8em;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--color-parchment-100);
  }

  .structure-item:hover {
    background: rgba(176, 141, 74, 0.1);
  }

  .structure-item.selected {
    border-color: rgba(176, 141, 74, 0.6);
    background: rgba(176, 141, 74, 0.14);
  }

  .structure-item.missing-resources.selected {
    border-color: rgba(91, 26, 31, 0.5);
    background: rgba(91, 26, 31, 0.08);
  }

  .structure-name {
    font-weight: 600;
    font-size: 1.1em;
    margin-bottom: 0.4em;
    color: var(--color-parchment-100);
  }

  .structure-description {
    font-size: 0.9em;
    margin-bottom: 0.8em;
    color: var(--color-parchment-200);
    line-height: 1.4;
    font-family: var(--font-editorial);
    font-style: italic;
  }

  .structure-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6em;
    margin-bottom: 1em;
  }

  .feature {
    display: flex;
    align-items: center;
    padding: 0.3em 0.6em;
    background: rgba(176, 141, 74, 0.08);
    border: 0.075em solid rgba(176, 141, 74, 0.2);
    color: var(--color-parchment-200);
    font-size: 0.9em;
  }

  .required-resources {
    margin: 0.8em 0;
  }

  .required-title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 0.8em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.4em;
    color: var(--color-aged-gold);
  }

  .resource-requirement {
    display: flex;
    justify-content: space-between;
    padding: 0.4em 0.6em;
    margin: 0.3em 0;
    font-size: 0.85em;
  }

  .has-resource {
    background: rgba(63, 90, 78, 0.15);
    border: 0.075em solid rgba(76, 175, 80, 0.2);
    color: #6fcf79;
  }

  .missing-resource {
    background: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.3);
    color: #ff5757;
  }

  .build-time {
    font-size: 0.9em;
    padding: 0.4em 0;
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }

  .group-name-row {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
    margin-bottom: 1em;
  }

  .group-name-row label {
    font-size: 0.8em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .text-input {
    padding: 0.6em;
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    font-size: 1em;
    width: 100%;
    background: rgba(26, 32, 48, 0.6);
    color: var(--color-parchment-200);
    font-family: var(--font-body);
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-aged-gold);
  }

  .next-tick-info {
    margin-top: 1em;
    padding: 0.8em;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .next-tick-time {
    font-size: 0.9em;
    margin-bottom: 0.3em;
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }

  .completion-time {
    font-weight: 500;
    color: var(--color-gold-pale);
    font-size: 0.9em;
    font-family: var(--font-mono);
  }

  .build-error {
    padding: 0.7em 1em;
    background: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.4);
    color: #ff5757;
    font-size: 0.9em;
    margin-bottom: 1em;
  }

  .button-row {
    display: flex;
    justify-content: flex-end;
    gap: 0.8em;
    margin-top: 1em;
    padding: 0.5em 0;
  }

  .cancel-btn, .build-btn {
    padding: 0.7em 1.5em;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.2s;
    border: 0;
    min-width: 8em;
  }

  .cancel-btn {
    background: transparent;
    color: var(--color-parchment-200);
    border: 0.075em solid rgba(176, 141, 74, 0.35);
  }

  .cancel-btn:hover {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .build-btn {
    background-color: var(--color-aged-gold);
    color: var(--color-ink-900);
  }

  .build-btn:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .build-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .no-groups,
  .no-tile {
    text-align: center;
    color: rgba(232, 228, 210, 0.55);
    font-size: 0.9em;
    padding: 1em;
    font-style: italic;
  }

  .build-status {
    margin-top: 1em;
    padding: 0.8em;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .progress-bar {
    height: 0.4em;
    background: rgba(176, 141, 74, 0.12);
    overflow: hidden;
    margin-bottom: 0.5em;
  }

  .progress {
    height: 100%;
    background: linear-gradient(to right, var(--color-aged-gold), var(--color-gold-pale));
    transition: width 0.2s;
  }

  .time-remaining {
    font-size: 0.9em;
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }

  .structure-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 1em;
    margin-top: 0.5em;
    font-size: 0.9em;
    color: var(--color-parchment-200);
    font-family: var(--font-mono);
  }

  .build-time, .durability {
    padding: 0.4em 0;
  }

  .durability {
    display: flex;
    align-items: center;
  }

  .durability::before {
    content: '🛡️';
    margin-right: 0.3em;
    font-size: 1em;
  }

  .validation-error {
    padding: 0.7em 1em;
    font-size: 0.9em;
    margin: 0.8em 0;
    display: flex;
    align-items: center;
  }

  .water-error {
    background: rgba(176, 141, 74, 0.08);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    color: var(--color-gold-pale);
  }

  .error-icon {
    margin-right: 0.5em;
    font-size: 1.1em;
  }
</style>
