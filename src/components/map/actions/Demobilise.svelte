<script>
  import { apiPost } from '../../../lib/api.js';

  import { targetStore } from '../../../lib/stores/map';
  import { currentPlayer, game, timeUntilNextTick } from '../../../lib/stores/game';

  const {
    onClose = () => {},
    onDemobilize = () => {},
  } = $props();

  // Use $derived for tileData to prevent reactivity issues
  let tileData = $derived($targetStore || null);
  
  // Initialize state
  let availableGroups = $state([]);
  let selectedGroup = $state(null);
  let storageDestination = $state('shared');
  let error = $state(null);
  let statusMessage = $state('');
  let processing = $state(false);
  
  // Add a flag to prevent re-filtering groups once an operation has started
  let operationInProgress = $state(false);

  // Create a derived value for player ID to avoid direct reactive reads in the effect
  let playerId = $derived($currentPlayer?.id);

  // Fix the effect that was causing the infinite loop
  $effect(() => {
    // Don't update available groups if an operation is in progress
    // This prevents the UI from showing "No groups available" while closing
    if (operationInProgress) return;
    
    // Reset groups list if we don't have valid data
    if (!tileData || !tileData.groups || !playerId) {
      availableGroups = [];
      selectedGroup = null;
      return;
    }
    
    // Create a new array without directly referencing reactively accessed properties inside filter
    const filteredGroups = [];
    
    // Manually iterate instead of using filter/map to prevent reactivity issues
    for (let i = 0; i < tileData.groups.length; i++) {
      const group = tileData.groups[i];
      if (group.owner === playerId && group.status === 'idle') {
        filteredGroups.push({
          ...group,
          selected: false
        });
      }
    }
    
    // Update state only once
    availableGroups = filteredGroups;
    
    // Auto-select only after setting availableGroups
    if (filteredGroups.length === 1 && !selectedGroup) {
      selectedGroup = filteredGroups[0];
    } else if (filteredGroups.length === 0) {
      selectedGroup = null;
    }
  });

  function selectGroup(group) {
    if (processing) return;
    selectedGroup = group;
    error = null;
    statusMessage = '';
  }

  async function startDemobilize() {
    if (!selectedGroup || processing) return;
    processing = true;
    // Set the flag to prevent re-filtering groups
    operationInProgress = true;
    error = null;
    statusMessage = 'Starting demobilization...';

    try {
      const result = await apiPost('/actions/demobiliseUnits', {
        groupId: selectedGroup.id,
        structureId: tileData.structure.id,
        locationX: tileData.x,
        locationY: tileData.y,
        worldId: $game.worldKey,
        storageDestination: storageDestination
      });

      console.log('Demobilization started:', result);
      const nextTickFormatted = timeUntilNextTick;
      statusMessage = `Demobilization started! Your group will be disbursed at the next game tick (in approximately ${nextTickFormatted}).`;

      onDemobilize({
        group: selectedGroup,
        structure: tileData.structure,
        location: { x: tileData.x, y: tileData.y },
        storageDestination: storageDestination
      });

      onClose(true);
      
    } catch (err) {
      console.error('Demobilization error:', err);
      error = err.message || 'An error occurred during demobilization.';
      statusMessage = '';
      // Reset the operation flag on error
      operationInProgress = false;
    } finally {
      processing = false;
      // We don't reset operationInProgress here because we want to keep
      // the UI stable until the modal is closed
    }
  }

  function _fmt(t) {
    if (!t) return '';
    return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<div
  class="demobilise-modal"
>
  <div class="content">
    {#if tileData && tileData.structure}
      <p class="description">
        Select a group to demobilise at this structure. 
        The group will disband at the next game tick, and all units will join this location.
      </p>
      
      {#if availableGroups.length > 0}
        <div class="group-selection">
          <h3>Available Groups</h3>
          <div class="groups-list">
            {#each availableGroups as group}
              <button 
                class="group-item" 
                class:selected={selectedGroup?.id === group.id}
                disabled={processing}
                onclick={() => selectGroup(group)}
                aria-pressed={selectedGroup?.id === group.id}
              >
                <div class="group-info">
                  <div class="group-name">{group.name || `Group ${group.id.slice(-4)}`}</div>
                  <div class="group-units">{group.units?.length || 'Unknown'} units</div>
                </div>
              </button>
            {/each}
          </div>
        </div>
        
        {#if error}
          <div class="error">{error}</div>
        {/if}
        
        {#if statusMessage}
          <div class="status">
            {statusMessage}
            {#if !processing}
              <button class="close-now-btn" onclick={() => onClose(true)}>
                Close
              </button>
            {/if}
          </div>
        {/if}
        
        <div class="structure-info">
          <h3>Destination Structure</h3>
          <div class="structure-name">
            {tileData.structure.name || _fmt(tileData.structure.type) || 'Structure'}
          </div>
          <div class="coordinates">{tileData.x}, {tileData.y}</div>
        </div>
        
        <div class="storage-options">
          <h3>Storage Options</h3>
          <div class="radio-options">
            <label class="radio-label">
              <input 
                type="radio" 
                name="storage" 
                value="shared" 
                checked={storageDestination === 'shared'}
                onchange={() => storageDestination = 'shared'}
                disabled={processing}
              />
              <span class="radio-text">Shared Storage</span>
              <span class="radio-description">Items will be accessible by anyone at this structure</span>
            </label>
            
            <label class="radio-label">
              <input 
                type="radio" 
                name="storage" 
                value="personal"
                checked={storageDestination === 'personal'} 
                onchange={() => storageDestination = 'personal'}
                disabled={processing}
              />
              <span class="radio-text">Personal Bank</span>
              <span class="radio-description">Items will only be accessible by you</span>
            </label>
          </div>
        </div>
        
        <div class="actions">
          <button 
            class="cancel-btn" 
            onclick={() => onClose()} 
            disabled={processing}
          >
            Cancel
          </button>
          
          <button 
            class="demobilise-btn" 
            onclick={startDemobilize} 
            disabled={!selectedGroup || processing}
          >
            {processing ? 'Processing...' : 'Demobilise'}
          </button>
        </div>
      {:else}
        <div class="empty-state">
          <p>No groups available to demobilise at this location.</p>
          <button class="close-btn-secondary" onclick={() => onClose()}>
            Close
          </button>
        </div>
      {/if}
    {:else}
      <p class="no-tile">No structure available for demobilization</p>
      <button class="close-btn-secondary" onclick={() => onClose()}>
        Close
      </button>
    {/if}
  </div>
</div>

<style>
  .demobilise-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--chrome-text);
    font-family: var(--font-body);
  }

  .content {
    padding: 1em;
    overflow-y: auto;
    flex: 1;
    color: var(--chrome-text);
  }

  .description {
    margin-bottom: 1.5em;
    color: var(--chrome-text-dim);
  }

  .group-selection {
    margin-bottom: 1.5em;
  }

  h3 {
    font-size: 0.8em;
    margin: 0 0 0.8em 0;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .groups-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    max-height: 12em;
    overflow-y: auto;
  }

  .group-item {
    display: flex;
    align-items: center;
    padding: 0.8em;
    border: 0.075em solid var(--chrome-border);
    cursor: pointer;
    background: var(--chrome-field-bg);
    transition: background-color 0.2s;
    text-align: left;
    color: var(--chrome-text);
  }

  .group-item:hover:not(:disabled) {
    background: rgba(176, 141, 74, 0.1);
  }

  .group-item.selected {
    background: rgba(176, 141, 74, 0.14);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .group-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .group-info {
    flex: 1;
  }

  .group-name {
    font-weight: 500;
    margin-bottom: 0.2em;
    color: var(--chrome-text);
  }

  .group-units {
    font-size: 0.8em;
    color: var(--chrome-text-faint);
  }

  .structure-info {
    background: var(--chrome-field-bg);
    padding: 1em;
    border: 0.075em solid var(--chrome-border);
    margin-bottom: 1.5em;
  }

  .structure-name {
    font-weight: 500;
    margin-bottom: 0.2em;
    color: var(--chrome-text);
  }

  .coordinates {
    font-size: 0.9em;
    color: var(--chrome-text-faint);
    font-family: var(--font-mono, monospace);
  }

  .storage-options {
    margin-bottom: 1.5em;
  }

  .radio-options {
    display: flex;
    flex-direction: column;
    gap: 0.8em;
  }

  .radio-label {
    display: flex;
    flex-direction: column;
    padding: 0.8em;
    border: 0.075em solid var(--chrome-border);
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;
    padding-left: 2.5em;
  }

  .radio-label:hover {
    background: var(--chrome-gold-soft);
  }

  .radio-label input {
    position: absolute;
    left: 0.8em;
    top: 0.9em;
  }

  .radio-text {
    font-weight: 500;
    margin-bottom: 0.3em;
    color: var(--chrome-text);
  }

  .radio-description {
    font-size: 0.8em;
    color: var(--chrome-text-faint);
  }

  .radio-label input:checked + .radio-text {
    color: var(--chrome-gold);
  }

  .radio-label input:checked ~ .radio-description {
    color: var(--chrome-text-dim);
  }

  .radio-label:has(input:checked) {
    border-color: var(--chrome-gold-border);
    background: var(--chrome-gold-soft);
  }

  .error {
    padding: 0.8em;
    margin-bottom: 1em;
    background-color: rgba(91, 26, 31, 0.15);
    border-left: 3px solid rgba(91, 26, 31, 0.5);
    color: #ff5757;
  }

  .status {
    padding: 0.8em;
    margin-bottom: 1em;
    background-color: var(--chrome-gold-soft);
    border-left: 3px solid var(--chrome-gold-border);
    color: var(--chrome-text-dim);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.8em;
  }

  .close-btn-secondary {
    padding: 0.6em 1em;
    background: transparent;
    border: 0.075em solid var(--chrome-gold-border);
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 0.85em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--chrome-text);
    transition: background-color 0.2s;
  }

  .close-btn-secondary:hover {
    background: var(--chrome-gold-soft);
  }

  .cancel-btn, .demobilise-btn {
    padding: 0.7em 1.2em;
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 0.9em;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.2s;
    border: 0;
  }

  .cancel-btn {
    background: transparent;
    color: var(--chrome-text);
    border: 0.075em solid var(--chrome-gold-border);
  }

  .cancel-btn:hover:not(:disabled) {
    background-color: var(--chrome-gold-soft);
  }

  .demobilise-btn {
    background-color: var(--color-aged-gold);
    color: var(--color-ink-900);
  }

  .demobilise-btn:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .cancel-btn:disabled,
  .demobilise-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .empty-state {
    text-align: center;
    padding: 2em 1em;
    color: rgba(232, 228, 210, 0.55);
    font-style: italic;
  }

  .empty-state p {
    margin-bottom: 1em;
    color: var(--color-parchment-200);
  }

  .no-tile {
    padding: 2em 1em;
    text-align: center;
    color: var(--color-parchment-200);
  }
</style>
