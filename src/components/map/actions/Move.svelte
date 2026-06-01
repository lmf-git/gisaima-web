<script>
  import { onMount } from 'svelte';
  import { currentPlayer } from '../../../lib/stores/game';
  import { targetStore } from '../../../lib/stores/map';

  import Compass from '../../icons/Compass.svelte';

  const {
    onClose = () => {},
    onStartPathDrawing = () => {},
  } = $props();


  let selectedGroupId = $state(null);
  let processing = $state(false);
  let isSubmitting = $state(false);
  let error = $state(null);
  
  // Derived states
  const currentTile = $derived($targetStore);
  const eligibleGroups = $derived(getEligibleGroups());
  
  onMount(() => {
    // Auto-select the group if there's only one eligible option
    if (eligibleGroups.length === 1) {
      selectedGroupId = eligibleGroups[0].id;
    }
  });

  function getEligibleGroups() {
    // Get groups owned by current player that are idle and not in battle
    if (!currentTile?.groups || !$currentPlayer) return [];
    
    return currentTile.groups.filter(group => 
      group.owner === $currentPlayer.id && 
      group.status === 'idle'
    );
  }

  function startPathDrawing() {
    if (!selectedGroupId || processing) return;
    
    processing = true; // Set processing state
    
    try {
      const group = eligibleGroups.find(g => g.id === selectedGroupId);
      if (!group) {
        error = "Selected group not found";
        processing = false;
        return;
      }
      
      // Add the current position as startPoint to the group object
      const groupWithStartPoint = {
        ...group,
        startPoint: {
          x: currentTile.x,
          y: currentTile.y
        }
      };
      
      // Call onDrawPath with the group data to start path drawing mode
      onStartPathDrawing(groupWithStartPoint);
      
      // Close this modal, passing true as second parameter to indicate we're starting path drawing
      onClose();
    } catch (e) {
      error = e.message || "An error occurred";
      processing = false;
    }
  }

</script>

<div class="move-modal">
  <div class="modal-body">
    {#if eligibleGroups.length === 0}
      <div class="message error">
        You don't have any idle groups on this tile that can move.
      </div>
    {:else}
      <div class="section">
        <h4>Select Group to Move</h4>
        <div class="groups-list">
          {#each eligibleGroups as group}
            <label class="group-option {selectedGroupId === group.id ? 'selected' : ''}">
              <input 
                type="radio" 
                name="groupSelect" 
                value={group.id} 
                bind:group={selectedGroupId} 
              />
              <div class="group-details">
                <div class="group-name">{group.name || `Group ${group.id.substring(0, 5)}`}</div>
                <div class="group-units">{group.units?.length || 1} units</div>
              </div>
            </label>
          {/each}
        </div>
      </div>

      {#if error}
        <div class="message error">{error}</div>
      {/if}

      <div class="info-box">
        <p>Select a group to move and draw a path on the map.</p>
      </div>
    {/if}
  </div>

  <footer class="modal-footer">
    <button 
      class="cancel-button" 
      onclick={onClose}
      disabled={processing}
    >
      Cancel
    </button>
    
    <button 
      class="action-button" 
      onclick={startPathDrawing}
      disabled={!selectedGroupId || processing || isSubmitting}
    >
      <Compass extraClass="compass-icon" />
      {processing ? 'PROCESSING...' : 'PLOT YOUR JOURNEY'}
    </button>
  </footer>
</div>

<style>
  .move-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  .modal-body {
    padding: 1em;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .section {
    margin-bottom: 1em;
  }

  h4 {
    margin: 0 0 0.5em 0;
    font-size: 0.8em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-aged-gold);
  }

  .groups-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .group-option {
    display: flex;
    align-items: center;
    padding: 0.5em;
    cursor: pointer;
    background-color: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    transition: background-color 0.2s;
  }

  .group-option:hover {
    background-color: rgba(176, 141, 74, 0.1);
  }

  .group-option.selected {
    background-color: rgba(176, 141, 74, 0.14);
    border-color: rgba(176, 141, 74, 0.45);
  }

  .group-option input {
    margin-right: 0.5em;
  }

  .group-details {
    display: flex;
    flex-direction: column;
    gap: 0.2em;
  }

  .group-name {
    font-weight: 500;
    color: var(--color-parchment-100);
  }

  .group-units {
    font-size: 0.85em;
    color: rgba(232, 228, 210, 0.65);
  }

  .info-box {
    padding: 0.6em;
    background-color: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    font-size: 0.9em;
    color: var(--color-parchment-200);
    text-align: center;
  }

  .message {
    padding: 0.7em;
    font-size: 0.9em;
    text-align: center;
    color: var(--color-parchment-100);
  }

  .message.error {
    background-color: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.4);
    color: #ff5757;
  }

  .modal-footer {
    display: flex;
    justify-content: space-between;
    gap: 1em;
    padding: 0.8em 1em;
    background: rgba(176, 141, 74, 0.05);
    border-top: 0.075em solid rgba(176, 141, 74, 0.18);
  }

  .cancel-button, .action-button {
    padding: 0.5em 1em;
    font-size: 0.9em;
    font-weight: 600;
    font-family: var(--font-display);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 0.2s;
    border: 0;
  }

  .cancel-button {
    background: transparent;
    color: var(--color-parchment-200);
    border: 0.075em solid rgba(176, 141, 74, 0.35);
  }

  .cancel-button:hover:not(:disabled) {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .action-button {
    background-color: var(--color-aged-gold);
    color: var(--color-ink-900);
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
  }

  .action-button:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .action-button:disabled, .cancel-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  :global(.compass-icon) {
    width: 1.2em;
    fill: currentColor;
  }
</style>
