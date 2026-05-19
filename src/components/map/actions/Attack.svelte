<script>
  import { apiPost } from '../../../lib/api.js';
  import { scale } from 'svelte/transition';

  import { currentPlayer, game } from '../../../lib/stores/game';
  import { targetStore, entities } from '../../../lib/stores/map';

  import Close from '../../icons/Close.svelte';
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';
  import Structure from '../../icons/Structure.svelte';

  const { 
    onClose = () => {},
    isActive = false, // Add prop for z-index control
    onMouseEnter = () => {} // Add prop for mouse enter event 
  } = $props();

  // Get tile data directly from the targetStore (same as current player location)
  let tileData = $derived($targetStore || null);

  // Format text for display
  const _fmt = t => t?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Function to count units in a group, handling both array and object formats
  function getGroupUnitCount(group) {
    if (!group.units) return 0;
    return Array.isArray(group.units) ? group.units.length : Object.keys(group.units).length;
  }
  
  // Available groups and enemy targets
  let playerGroups = $state([]);
  let enemyGroups = $state([]);
  let structures = $state([]);
  
  // Use arrays for selected groups instead of single selections
  let selectedPlayerGroups = $state([]);
  let selectedEnemyGroups = $state([]);
  let selectedStructure = $state(null);
  
  // Loading state
  let loading = $state(false);
  let errorMessage = $state('');
  
  // Memoize player ID to reduce calculations
  let currentPlayerId = $derived($currentPlayer?.id);
  
  // Helper function to normalize groups data - handles both array and object formats
  function normalizeGroupsData(groupsData) {
    if (!groupsData) return [];
    
    // If it's already an array, return it
    if (Array.isArray(groupsData)) return groupsData;
    
    // If it's an object with keys, convert to array
    if (typeof groupsData === 'object') {
      return Object.keys(groupsData).map(key => {
        const data = groupsData[key];
        return {
          ...data,
          id: data.id || key
        };
      });
    }
    
    return [];
  }
  
  // Calculate available groups and structures just once when tile data changes
  $effect(() => {
    if (!tileData || !currentPlayerId) return;
    
    // Handle groups
    if (tileData.groups) {
      const groups = normalizeGroupsData(tileData.groups);
      
      // Find player groups that can attack (idle groups)
      const myGroups = groups.filter(group => 
        group.owner === currentPlayerId && 
        group.status === 'idle'
      );
      
      // Find enemy groups that can be attacked (idle, gathering, building, or moving groups not owned by player)
      const enemies = groups.filter(group => 
        group.owner !== currentPlayerId && 
        (group.status === 'idle' || group.status === 'gathering' || 
         group.status === 'building' || group.status === 'moving')
      );

      // Update only if changes detected
      if (playerGroups.length !== myGroups.length || !playerGroups.every((g, i) => g.id === myGroups[i]?.id)) {
        playerGroups = myGroups;
        
        // Auto-select first group if there's only one player group
        if (myGroups.length === 1) {
          selectedPlayerGroups = [myGroups[0]];
        } else {
          // Reset selections when groups change
          selectedPlayerGroups = [];
        }
      }
      
      if (enemyGroups.length !== enemies.length || !enemyGroups.every((g, i) => g.id === enemies[i]?.id)) {
        enemyGroups = enemies;
        // Reset selections when groups change
        selectedEnemyGroups = [];
      }
    } else {
      playerGroups = [];
      enemyGroups = [];
    }
    
    // Handle structure
    if (tileData.structure && 
        tileData.structure.owner && 
        tileData.structure.owner !== currentPlayerId &&
        !tileData.structure.battleId) {
      structures = [tileData.structure];
    } else {
      structures = [];
      if (selectedStructure) selectedStructure = null;
    }
  });
  
  // Toggle selection of a player group
  function togglePlayerGroup(group) {
    if (loading) return; // Prevent selection during loading
    
    const index = selectedPlayerGroups.findIndex(g => g.id === group.id);
    if (index >= 0) {
      // Remove from selection
      selectedPlayerGroups = [...selectedPlayerGroups.slice(0, index), ...selectedPlayerGroups.slice(index + 1)];
    } else {
      // Add to selection
      selectedPlayerGroups = [...selectedPlayerGroups, group];
    }
  }
  
  // Toggle selection of an enemy group
  function toggleEnemyGroup(group) {
    if (loading) return; // Prevent selection during loading
    
    const index = selectedEnemyGroups.findIndex(g => g.id === group.id);
    if (index >= 0) {
      // Remove from selection
      selectedEnemyGroups = [...selectedEnemyGroups.slice(0, index), ...selectedEnemyGroups.slice(index + 1)];
    } else {
      // Add to selection
      selectedEnemyGroups = [...selectedEnemyGroups, group];
    }
  }
  
  // Select a structure as target
  function selectStructure(structure) {
    if (loading) return; // Prevent selection during loading
    
    if (selectedStructure && selectedStructure.id === structure.id) {
      // Deselect if already selected
      selectedStructure = null;
    } else {
      // Select the structure
      selectedStructure = structure;
    }
  }
  
  // Add keyboard handlers to support accessibility
  function handlePlayerGroupKeyDown(event, group) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePlayerGroup(group);
    }
  }
  
  function handleEnemyGroupKeyDown(event, group) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleEnemyGroup(group);
    }
  }

  function handleStructureKeyDown(event, structure) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectStructure(structure);
    }
  }
  
  // Calculate total power for selected groups
  function calculateTotalPower(groups) {
    return groups.reduce((total, group) => {
      return total + (group.units?.length || 1);
    }, 0);
  }
  
  // Start an attack
  async function startAttack() {
    // Validate selections
    if (selectedPlayerGroups.length === 0) {
      errorMessage = "Select at least one of your groups to attack with";
      return;
    }

    if (selectedEnemyGroups.length === 0 && !selectedStructure) {
      errorMessage = "Select at least one target to attack (enemy groups or structure)";
      return;
    }
    
    loading = true;
    errorMessage = '';
    
    try {
      // Get arrays of IDs for attackers
      const attackerGroupIds = selectedPlayerGroups.map(g => g.id);
      
      // Common parameters
      const params = {
        worldId: $game.worldKey,
        attackerGroupIds: selectedPlayerGroups.map(g => g.id),
        locationX: tileData.x,
        locationY: tileData.y
      };
      
      // Add defender groups if any are selected
      if (selectedEnemyGroups.length > 0) {
        params.defenderGroupIds = selectedEnemyGroups.map(g => g.id);
      }
      
      // Add structure if one is selected
      if (selectedStructure) {
        params.structureId = selectedStructure.id;
        console.log('Targeting structure with ID:', selectedStructure.id);
      }
      
      console.log('Starting attack with params:', params);
      
      console.log('Calling attack function...');
      const result = await apiPost('/actions/attack', params);
      console.log('Attack function result:', result);

      if (result.success) {
        console.log('Attack started:', result);
        // Optimistically update attacker groups to 'fighting' status
        const tileKey = `${tileData.x},${tileData.y}`;
        entities.update(current => {
          const tileGroups = current.groups[tileKey];
          if (!tileGroups) return current;
          return {
            ...current,
            groups: {
              ...current.groups,
              [tileKey]: tileGroups.map(g =>
                selectedPlayerGroups.some(sg => sg.id === g.id)
                  ? { ...g, status: 'fighting' }
                  : g
              )
            }
          };
        });
        onClose(true);
      } else {
        errorMessage = result.error || 'Failed to start attack';
      }
    } catch (error) {
      console.error('Error starting attack:', error);
      // More specific error handling
      if (error.code === 'unauthenticated') {
        errorMessage = 'Authentication error: Please log in again.';
      } else if (error.code === 'not-found') {
        errorMessage = 'Target was not found. It may have moved or been destroyed.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.code === 'internal') {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.code === 'failed-precondition') {
        errorMessage = 'Cannot attack: target status has changed.';
      } else if (error.code === 'functions/unauthorized') {
        errorMessage = 'Authorization failure. Please log in again.';
      } else {
        errorMessage = error.message || 'Failed to start attack';
      }
    } finally {
      loading = false;
    }
  }
  
  // Check if a player group is selected
  function isPlayerGroupSelected(groupId) {
    return selectedPlayerGroups.some(g => g.id === groupId);
  }
  
  // Check if an enemy group is selected
  function isEnemyGroupSelected(groupId) {
    return selectedEnemyGroups.some(g => g.id === groupId);
  }
  
  // Check if attack is possible - need at least one group on attacker side and at least one target
  let canAttack = $derived(
    selectedPlayerGroups.length > 0 && 
    (selectedEnemyGroups.length > 0 || selectedStructure !== null) &&
    !loading
  );
  
  // Handle keyboard events
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      onClose();
    }
  }

  // Format owner name for display
  function formatOwnerName(group) {
    return group.ownerName || "Unknown Player";
  }

  // Check if we have structures available to attack
  let hasStructures = $derived(structures.length > 0);

  // Check if we have enemy groups available to attack
  let hasEnemyGroups = $derived(enemyGroups.length > 0);
  
  // Check if we have any targets at all
  let hasTargets = $derived(hasEnemyGroups || hasStructures);
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
  class="attack-modal"
  class:active={isActive}
  onmouseenter={onMouseEnter}
  role="dialog"
  tabindex="-1"
  transition:scale={{ start: 0.95, duration: 200 }}
>
  <header class="modal-header">
    <h2>Attack - {tileData?.x}, {tileData?.y}</h2>
    <button class="close-btn" onclick={onClose} aria-label="Close dialog">
      <Close size="1.5em" />
    </button>
  </header>
  
  <div class="content">
    {#if playerGroups.length === 0}
      <div class="message error">
        <p>You don't have any available groups that can attack.</p>
        <button class="cancel-btn" onclick={onClose}>Close</button>
      </div>
    {:else if !hasTargets}
      <div class="message error">
        <p>There are no valid targets to attack at this location.</p>
        <button class="cancel-btn" onclick={onClose}>Close</button>
      </div>
    {:else}
      {#if errorMessage}
        <div class="error-message">{errorMessage}</div>
      {/if}
      
      <div class="attack-selection">
        <div class="selection-section">
          <h3>Select Your Groups</h3>
          <div class="selection-count">({selectedPlayerGroups.length} selected)</div>
          <div class="groups-list">
            {#each playerGroups as group}
              <div 
                class="group-item" 
                class:selected={isPlayerGroupSelected(group.id)}
                onclick={() => togglePlayerGroup(group)}
                onkeydown={(e) => handlePlayerGroupKeyDown(e, group)}
                aria-disabled={loading}
                role="checkbox"
                aria-checked={isPlayerGroupSelected(group.id)}
                tabindex="0"
              >
                <div class="custom-checkbox" class:checked={isPlayerGroupSelected(group.id)}></div>
                <div class="entity-icon">
                  {#if group.race}
                    {#if group.race.toLowerCase() === 'human'}
                      <Human extraClass="race-icon-attack" />
                    {:else if group.race.toLowerCase() === 'elf'}
                      <Elf extraClass="race-icon-attack" />
                    {:else if group.race.toLowerCase() === 'dwarf'}
                      <Dwarf extraClass="race-icon-attack" />
                    {:else if group.race.toLowerCase() === 'goblin'}
                      <Goblin extraClass="race-icon-attack" />
                    {:else if group.race.toLowerCase() === 'fairy'}
                      <Fairy extraClass="race-icon-attack" />
                    {/if}
                  {/if}
                </div>
                <div class="group-info">
                  <div class="group-name">{group.name || `Group ${group.id.slice(-4)}`}</div>
                  <div class="group-details">
                    <span class="unit-count">Units: {getGroupUnitCount(group)}</span>
                    {#if group.race}
                      <span class="group-race">{_fmt(group.race)}</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <div class="selection-section enemies">
          <h3>Select Targets</h3>
          
          <!-- Show enemy groups if available -->
          {#if hasEnemyGroups}
            <div class="target-section">
              <h4>Enemy Groups</h4>
              <div class="selection-count">({selectedEnemyGroups.length} selected)</div>
              <div class="groups-list">
                {#each enemyGroups as group}
                  <div 
                    class="group-item enemy-group" 
                    class:selected={isEnemyGroupSelected(group.id)}
                    onclick={() => toggleEnemyGroup(group)}
                    onkeydown={(e) => handleEnemyGroupKeyDown(e, group)}
                    aria-disabled={loading}
                    role="checkbox"
                    aria-checked={isEnemyGroupSelected(group.id)}
                    tabindex="0"
                  >
                    <div class="custom-checkbox" class:checked={isEnemyGroupSelected(group.id)}></div>
                    <div class="entity-icon">
                      {#if group.race}
                        {#if group.race.toLowerCase() === 'human'}
                          <Human extraClass="race-icon-attack" />
                        {:else if group.race.toLowerCase() === 'elf'}
                          <Elf extraClass="race-icon-attack" />
                        {:else if group.race.toLowerCase() === 'dwarf'}
                          <Dwarf extraClass="race-icon-attack" />
                        {:else if group.race.toLowerCase() === 'goblin'}
                          <Goblin extraClass="race-icon-attack" />
                        {:else if group.race.toLowerCase() === 'fairy'}
                          <Fairy extraClass="race-icon-attack" />
                        {/if}
                      {/if}
                    </div>
                    <div class="group-info">
                      <div class="group-name">
                        {group.name || `Group ${group.id.slice(-4)}`}
                      </div>
                      <div class="group-details">
                        <span class="unit-count">Units: {getGroupUnitCount(group)}</span>
                        {#if group.race}
                          <span class="group-race">{_fmt(group.race)}</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          <!-- Show structure if available -->
          {#if hasStructures}
            <div class="target-section">
              <h4>Structure</h4>
              <div class="selection-count">({selectedStructure ? 1 : 0} selected)</div>
              <div class="groups-list">
                {#each structures as structure}
                  <div 
                    class="group-item structure-item" 
                    class:selected={selectedStructure && selectedStructure.id === structure.id}
                    onclick={() => selectStructure(structure)}
                    onkeydown={(e) => handleStructureKeyDown(e, structure)}
                    aria-disabled={loading}
                    role="checkbox"
                    aria-checked={selectedStructure && selectedStructure.id === structure.id}
                    tabindex="0"
                  >
                    <div class="custom-checkbox" class:checked={selectedStructure && selectedStructure.id === structure.id}></div>
                    <div class="entity-icon structure-icon">
                      <Structure extraClass="structure-icon-attack" />
                    </div>
                    <div class="group-info">
                      <div class="group-name">
                        {structure.name || `Structure ${structure.id.slice(-4)}`}
                      </div>
                      <div class="group-details">
                        <span class="structure-type">{_fmt(structure.type || "unknown")}</span>
                        {#if structure.race}
                          <span class="structure-race">{_fmt(structure.race)}</span>
                        {/if}
                      </div>
                      {#if structure.ownerName}
                        <div class="structure-owner">Owner: {structure.ownerName}</div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
      
      <div class="actions">
        <button class="cancel-btn" onclick={onClose} disabled={loading}>Cancel</button>
        <button 
          class="attack-btn" 
          onclick={startAttack}
          disabled={!canAttack || loading}
        >
          {loading ? 'Processing...' : 'Start Attack'}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .attack-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8em 1em;
    background: rgba(176, 141, 74, 0.08);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  h2, h3 {
    margin: 0;
    font-family: var(--font-display);
  }

  h2 {
    font-size: 1.1em;
    font-weight: 600;
    color: var(--color-aged-gold);
    letter-spacing: 0.06em;
  }

  h3 {
    margin-bottom: 0.8em;
    font-size: 0.8em;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.3em;
    display: flex;
    transition: background-color 0.2s;
    color: var(--color-parchment-100);
  }

  .close-btn:hover {
    background-color: rgba(176, 141, 74, 0.12);
  }

  .content {
    padding: 1em;
    overflow-y: auto;
    flex: 1;
  }

  .attack-selection {
    display: flex;
    flex-direction: column;
    gap: 1em;
    margin-bottom: 1.5em;
  }

  .selection-section {
    flex: 1;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 1em;
    background: rgba(176, 141, 74, 0.03);
  }

  .selection-section.enemies {
    display: flex;
    flex-direction: column;
  }

  .selection-count {
    font-size: 0.8em;
    color: rgba(232, 228, 210, 0.55);
    font-weight: normal;
    margin-bottom: 0.8em;
    margin-top: -0.5em;
  }

  .groups-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    max-height: 15em;
    overflow-y: auto;
  }

  .group-item {
    padding: 0.8em;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    cursor: pointer;
    transition: background-color 0.2s;
    background: rgba(176, 141, 74, 0.05);
    display: flex;
    align-items: center;
    gap: 0.8em;
    width: 100%;
    font-family: var(--font-body);
    font-size: 1em;
    color: var(--color-parchment-100);
  }

  .custom-checkbox {
    width: 1.2em;
    height: 1.2em;
    border: 0.075em solid rgba(176, 141, 74, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background-color 0.2s;
    position: relative;
  }

  .custom-checkbox.checked {
    background-color: var(--color-aged-gold);
    border-color: var(--color-aged-gold);
  }

  .custom-checkbox.checked::after {
    content: "✓";
    color: var(--color-ink-900);
    font-size: 0.9em;
    font-weight: bold;
  }

  .enemy-group .custom-checkbox.checked {
    background-color: var(--color-wax-red);
    border-color: var(--color-wax-red);
  }

  .structure-item .custom-checkbox.checked {
    background-color: rgba(176, 141, 74, 0.7);
    border-color: var(--color-aged-gold);
  }

  .group-info {
    flex: 1;
  }

  .group-item:hover {
    background-color: rgba(176, 141, 74, 0.1);
  }

  .group-item.selected {
    background-color: rgba(176, 141, 74, 0.14);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .group-item.enemy-group {
    border-color: rgba(91, 26, 31, 0.3);
  }

  .group-item.enemy-group:hover {
    background-color: rgba(91, 26, 31, 0.08);
  }

  .group-item.enemy-group.selected {
    background-color: rgba(91, 26, 31, 0.12);
    border-color: rgba(91, 26, 31, 0.4);
  }

  .group-item.structure-item {
    border-color: rgba(176, 141, 74, 0.25);
  }

  .group-item.structure-item:hover {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .group-item.structure-item.selected {
    background-color: rgba(176, 141, 74, 0.14);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .group-name {
    font-weight: 600;
    margin-bottom: 0.3em;
    color: var(--color-parchment-100);
  }

  .group-details {
    font-size: 0.9em;
    color: var(--color-parchment-200);
    display: flex;
    justify-content: space-between;
  }

  .unit-count, .structure-type {
    color: var(--color-parchment-200);
    font-weight: 500;
  }

  .group-race, .structure-race {
    color: var(--color-gold-pale);
    font-weight: 500;
  }

  .structure-owner {
    font-size: 0.9em;
    color: rgba(232, 228, 210, 0.65);
    margin-top: 0.2em;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 1em;
    margin-top: 1em;
  }

  .cancel-btn, .attack-btn {
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

  .cancel-btn:hover:not(:disabled) {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .attack-btn {
    background-color: var(--color-wax-red);
    color: var(--color-parchment-100);
  }

  .attack-btn:hover:not(:disabled) {
    background-color: #7a2228;
  }

  .attack-btn:disabled, .cancel-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.8em;
    background-color: rgba(91, 26, 31, 0.15);
    border-left: 3px solid rgba(91, 26, 31, 0.5);
    margin-bottom: 1em;
    color: #ff5757;
  }

  .message.error {
    padding: 0.8em;
    background-color: rgba(91, 26, 31, 0.15);
    border-left: 3px solid rgba(91, 26, 31, 0.5);
    margin-bottom: 1em;
    color: #ff5757;
    display: flex;
    flex-direction: column;
    gap: 1em;
    align-items: center;
  }

  .entity-icon {
    margin-right: 0.4em;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.race-icon-attack) {
    width: 1.4em;
    height: 1.4em;
    opacity: 0.85;
    fill: var(--color-gold-pale);
  }

  :global(.structure-icon-attack) {
    width: 1.4em;
    height: 1.4em;
    opacity: 0.85;
    fill: var(--color-gold-pale);
  }

  .target-section {
    margin-bottom: 1em;
    border-top: 0.075em solid rgba(176, 141, 74, 0.18);
    padding-top: 0.8em;
  }

  .target-section:first-child {
    border-top: none;
    padding-top: 0;
  }

  h4 {
    margin: 0 0 0.5em 0;
    font-family: var(--font-display);
    font-size: 0.75em;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }
</style>
