<script>
  import { apiPost } from '../../../lib/api.js';

  import { currentPlayer, game } from '../../../lib/stores/game';
  import { targetStore, entities } from '../../../lib/stores/map';

  const {
    onClose = () => {},
    onGather = () => {},
  } = $props();
  // Use $derived for tileData to prevent reactivity issues
  let tileData = $derived($targetStore || null);
  
  // Initialize state
  let availableGroups = $state([]);
  let selectedGroup = $state(null);
  let error = $state(null);
  let statusMessage = $state('');
  let processing = $state(false);
  let gatherUntilFull = $state(false);
  
  // Add a flag to prevent re-filtering groups once an operation has started
  let operationInProgress = $state(false);
  
  // Create a derived value for player ID to avoid direct reactive reads in the effect
  let playerId = $derived($currentPlayer?.id);
  
  $effect(() => {
    // Don't update available groups if an operation is in progress
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
  
  async function startGathering() {
    if (!selectedGroup || processing) return;
    processing = true;
    // Set the flag to prevent re-filtering groups
    operationInProgress = true;
    error = null;
    statusMessage = 'Starting gathering...';
    
    try {
      const result = await apiPost('/actions/startGathering', {
        groupId: selectedGroup.id,
        locationX: tileData.x,
        locationY: tileData.y,
        worldId: $game.worldKey,
        gatherUntilFull
      });

      if (result?.success) {
        // Optimistically update the group status so the UI reflects it immediately
        const tileKey = `${tileData.x},${tileData.y}`;
        const groupId = selectedGroup.id;
        entities.update(current => {
          const tileGroups = current.groups[tileKey];
          if (!tileGroups) return current;
          return {
            ...current,
            groups: {
              ...current.groups,
              [tileKey]: tileGroups.map(g =>
                g.id === groupId
                  ? { ...g, status: 'gathering', gatheringTicksRemaining: 2 }
                  : g
              )
            }
          };
        });

        if (onGather) {
          onGather({
            group: selectedGroup,
            location: { x: tileData.x, y: tileData.y }
          });
        }

        onClose(true);
      } else {
        error = result?.message || 'Failed to start gathering';
        operationInProgress = false;
      }

    } catch (err) {
      console.error('Gathering error:', err);
      error = err.message || 'An error occurred during gathering.';
      statusMessage = '';
      // Reset the operation flag on error
      operationInProgress = false;
    } finally {
      processing = false;
      // We don't reset operationInProgress here to keep the UI stable
    }
  }
  
  function _fmt(t) {
    if (!t) return '';
    return t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
</script>

<div
  class="gather-modal"
>
  <div class="content">
    {#if tileData}
      <p class="description">
        Select a group to gather resources at this location.
        Gathering will complete after 2 game ticks.
      </p>
      
      <div class="location-info">
        <div class="terrain">
          <div class="terrain-color" style="background-color: {tileData.color}"></div>
          <span class="terrain-name">{_fmt(tileData.biome?.name) || "Unknown"}</span>
        </div>
      </div>
      
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
        
        <label class="toggle-row">
          <input type="checkbox" bind:checked={gatherUntilFull} disabled={processing} />
          <span>Gather until full capacity</span>
        </label>

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
        
        <div class="actions">
          <button 
            class="cancel-btn" 
            onclick={() => onClose()} 
            disabled={processing}
          >
            Cancel
          </button>
          
          <button 
            class="gather-btn" 
            onclick={startGathering} 
            disabled={!selectedGroup || processing}
          >
            {processing ? 'Processing...' : 'Gather Resources'}
          </button>
        </div>
      {:else}
        <div class="empty-state">
          <p>No groups available to gather at this location.</p>
          <button class="close-btn-secondary" onclick={() => onClose()}>
            Close
          </button>
        </div>
      {/if}
    {:else}
      <p class="no-tile">No location selected</p>
      <button class="close-btn-secondary" onclick={() => onClose()}>
        Close
      </button>
    {/if}
  </div>
</div>

<style>
  .gather-modal {
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

  .description {
    margin-bottom: 1.5em;
    color: var(--color-parchment-200);
  }

  .location-info {
    margin-bottom: 1.5em;
    background: rgba(176, 141, 74, 0.05);
    padding: 1em;
    border: 0.075em solid rgba(176, 141, 74, 0.18);
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

  .terrain-name {
    color: var(--color-parchment-200);
    font-weight: 500;
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
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    cursor: pointer;
    background: rgba(176, 141, 74, 0.05);
    transition: background-color 0.2s;
    text-align: left;
    color: var(--color-parchment-100);
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
    color: var(--color-parchment-100);
  }

  .group-units {
    font-size: 0.8em;
    color: rgba(232, 228, 210, 0.65);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    margin-bottom: 1em;
    cursor: pointer;
    font-size: 0.9em;
    color: var(--color-parchment-200);
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
    background-color: rgba(176, 141, 74, 0.08);
    border-left: 3px solid rgba(176, 141, 74, 0.4);
    color: var(--color-parchment-200);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.8em;
  }

  .close-btn-secondary {
    padding: 0.6em 1em;
    background: transparent;
    border: 0.075em solid rgba(176, 141, 74, 0.35);
    cursor: pointer;
    font-family: var(--font-display);
    font-size: 0.85em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-parchment-200);
    transition: background-color 0.2s;
  }

  .close-btn-secondary:hover {
    background: rgba(176, 141, 74, 0.08);
  }

  .cancel-btn, .gather-btn {
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
    color: var(--color-parchment-200);
    border: 0.075em solid rgba(176, 141, 74, 0.35);
  }

  .cancel-btn:hover:not(:disabled) {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .gather-btn {
    background-color: var(--color-aged-gold);
    color: var(--color-ink-900);
  }

  .gather-btn:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .cancel-btn:disabled,
  .gather-btn:disabled {
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
