<script>
  import { apiPost } from '../../../lib/api.js';
  import { scale } from 'svelte/transition';

  import { goto } from '$app/navigation';
  
  import { user } from '../../../lib/stores/user';
  import { game } from '../../../lib/stores/game';
  import {
    moveTarget, map, targetStore, clearSavedTargetPosition, entities, refetchLoadedChunks
  } from '../../../lib/stores/map';

  import Torch from '../../icons/Torch.svelte';
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';

  
  const {
    onClose = () => {},
    onSpawnComplete = () => {} 
  } = $props();

  // Component state using Svelte 5 runes
  let selectedSpawn = $state(null);
  let loading = $state(false);
  let error = $state(null);
  
  // Simplify player status detection using $derived
  const deathMessage = $derived($game.player?.lastMessage?.text || '');
  
  // Extract player display name from game store
  const playerDisplayName = $derived($game.player?.displayName || '');

  // Use $derived correctly following the Features.svelte pattern
  const spawnList = $derived((() => {
    // Get spawns from world data
    const world = $game.worlds?.[$game.worldKey];
    const spawns = world?.spawns ? Object.values(world.spawns) : [];

    return spawns.filter(spawn => {
      if (!$game.player?.race) return true;
      return spawn.race?.toLowerCase() === $game.player.race.toLowerCase();
    });
  })());

  // Add a helper function to format text with proper capitalization
  function formatRace(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Enhanced effect to handle spawn selection and map movement
  $effect(() => {
    // Skip if no spawns available
    if (spawnList.length === 0 || selectedSpawn) return;
    
    // Auto-select spawn if it's the only option or single match for player race
    let preferredSpawn = null;
    
    if (spawnList.length === 1) {
      // Single spawn case
      preferredSpawn = spawnList[0];
    } else if ($game.player?.race) {
      // Multiple spawns - check for single race match
      const raceMatches = spawnList.filter(spawn => 
        spawn.race?.toLowerCase() === $game.player.race.toLowerCase()
      );
      
      if (raceMatches.length === 1) {
        preferredSpawn = raceMatches[0];
      }
    }
    
    if (preferredSpawn) {
      // Auto-select the preferred spawn
      selectSpawn(preferredSpawn, false); // Pass false to avoid auto-moving the map
      
      // Get the correct coordinates
      const spawnX = preferredSpawn.x ?? preferredSpawn.position?.x ?? 0;
      const spawnY = preferredSpawn.y ?? preferredSpawn.position?.y ?? 0;
      
      // Always move to exact spawn coordinates when there's only one spawn
      // No distance check needed - we want exact positioning
      const currentX = $targetStore.x;
      const currentY = $targetStore.y;
      
      if (currentX !== spawnX || currentY !== spawnY) {
        console.log(`Moving map view to spawn point: ${spawnX},${spawnY} (from ${currentX},${currentY})`);
        moveTarget(spawnX, spawnY);
      } else {
        console.log(`Map already centered at spawn coordinates: ${spawnX},${spawnY}`);
      }
    }
  });

  // Enhanced effect to handle unauthorized world access with better timing
  $effect(() => {
    // Wait until we have enough information to make a decision
    if (!$user || !$game.worldKey) return;
    
    // null means not yet fetched — wait before checking membership
    if (Array.isArray($game.joinedWorlds)) {
      if (!$game.joinedWorlds.includes($game.worldKey)) {
        console.log(`SpawnMenu detected user is not a member of world ${$game.worldKey}, redirecting to worlds page`);
        goto('/worlds');
        return;
      }
      
      // If we have player data but no spawns available for the player's race,
      // it means they can't spawn in this world
      if (spawnList.length === 0 && $game.player?.race) {
        console.log(`No available spawns for player race: ${$game.player.race}, redirecting to worlds page`);
        goto('/worlds');
        return;
      }
    }
  });

  // Helper function for setting/clearing errors
  function setError(message) {
    error = message;
    console.error(message);
    
    // Auto-clear error after 5 seconds
    setTimeout(() => {
      if (error === message) {
        error = null;
      }
    }, 5000);
  }

  // Helper function for setting loading state
  function setLoading(isLoading) {
    loading = isLoading;
  }

  // Handle spawn selection
  function selectSpawn(spawn, shouldMoveMap = true) {
    selectedSpawn = spawn;
    console.log(`Selected spawn: ${spawn.name || spawn.id} at ${spawn.position?.x},${spawn.position?.y}`);
    
    if (!shouldMoveMap) return;
    
    // Get coordinates safely with null coalescing
    const spawnX = spawn.x ?? spawn.position?.x ?? 0;
    const spawnY = spawn.y ?? spawn.position?.y ?? 0;
    
    // Store original coordinates before moving
    const originalX = $map.target.x;
    const originalY = $map.target.y;
    
    // Only move if we're not already at these coordinates
    if (originalX !== spawnX || originalY !== spawnY) {
      console.log(`Moving map view from ${originalX},${originalY} to spawn at ${spawnX},${spawnY}`);
      moveTarget(spawnX, spawnY);
    }
  }

  // Core function for handling spawn confirmation - updated to use Cloud Function
  async function confirm(spawn) {
    if (!spawn || !$user || !$game.worldKey) {
      setError('Missing required data for spawn selection');
      return;
    }

    try {
      setLoading(true);
      
      // Store the spawn coordinates to ensure we use consistent values throughout
      const spawnX = spawn.x ?? spawn.position?.x ?? 0;
      const spawnY = spawn.y ?? spawn.position?.y ?? 0;

      // Clear any saved target position to prevent it overriding spawn location
      clearSavedTargetPosition($game.worldKey);

      console.log(`Spawning player at ${spawnX},${spawnY} for spawn ID: ${spawn.id || 'unknown'}`);
      
      const result = await apiPost('/actions/spawnPlayer', {
        worldId: $game.worldKey,
        spawnId: spawn.id || null,
        spawnX,
        spawnY
      });
      
      if (!result.success) {
        throw new Error('Spawn operation failed');
      }

      console.log('Player spawned successfully:', result);

      // Ensure map is still focused on spawn location before closing
      if ($map.target.x !== spawnX || $map.target.y !== spawnY) {
        console.log(`Re-centering map on spawn location before closing: ${spawnX},${spawnY}`);
        moveTarget(spawnX, spawnY);
      }

      // Update game store so the parent {#if !player.alive} condition closes this dialog
      game.update(s => ({
        ...s,
        player: {
          ...s.player,
          alive: true,
          lastLocation: { x: spawnX, y: spawnY, timestamp: result.timestamp }
        }
      }));

      // Optimistically add the player to the spawn tile so peek actions update immediately
      const tileKey = `${spawnX},${spawnY}`;
      const spawnedPlayer = {
        id: $user.uid,
        displayName: $game.player?.displayName || $user.uid.substring(0, 8),
        race: $game.player?.race || 'human',
        x: spawnX,
        y: spawnY
      };
      entities.update(e => ({
        ...e,
        players: {
          ...e.players,
          [tileKey]: [...(e.players[tileKey] || []).filter(p => p.id !== $user.uid), spawnedPlayer]
        }
      }));

      // The spawn-area chunks were loaded before this character had any sight, so
      // the server filtered out structures/buildings the new spawn sight now covers.
      // Re-pull the loaded chunks (server visibility was invalidated on spawn) so
      // those structures appear immediately instead of only after a page refresh.
      refetchLoadedChunks();

      // Notify about spawn completion
      onSpawnComplete();
    
    } catch (error) {
      console.error('Error selecting spawn point:', error);
      setError(`Failed to select spawn: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      // Do nothing for Escape key as we don't want to close the spawn menu
      // Only proceed once player has chosen a spawn point
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div 
  class="spawn-menu-wrapper" 
  class:loading={loading} 
  transition:scale={{ start: 0.95, duration: 200 }}
>
  <div class="spawn-menu">
    <header class="modal-header">
      <h2 id="spawn-title">
        {#if deathMessage}
          You have fallen
        {:else}
          Choose Spawn Point
        {/if}
      </h2>
    </header>
    
    <div class="content">
      <!-- Death message or race header -->
      {#if deathMessage}
        <div class="death-message-container">
          <p class="death-message">
            {deathMessage || "You were defeated in battle."}
          </p>
        </div>
      {:else}
        <div class="race-header">
          {#if $game.player?.race}
            <div class="race-icon">
              {#if $game.player.race.toLowerCase() === 'human'}
                <Human extraClass="spawn-race-icon" />
              {:else if $game.player.race.toLowerCase() === 'elf'}
                <Elf extraClass="spawn-race-icon" />
              {:else if $game.player.race.toLowerCase() === 'dwarf'}
                <Dwarf extraClass="spawn-race-icon" />
              {:else if $game.player.race.toLowerCase() === 'goblin'}
                <Goblin extraClass="spawn-race-icon" />
              {:else if $game.player.race.toLowerCase() === 'fairy'}
                <Fairy extraClass="spawn-race-icon" />
              {/if}
            </div>
            <span class="welcome-text">
              Welcome {formatRace($game.player.race)} 
              {#if playerDisplayName}
                <strong>{playerDisplayName}</strong>
              {/if}
            </span>
          {/if}
        </div>
      {/if}
      
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      
      <div class="spawn-container">
        <div class="spawn-list">
          {#each spawnList as spawn (spawn.id)}
            <button 
              class="spawn-item" 
              class:selected={selectedSpawn?.id === spawn.id}
              onclick={() => selectSpawn(spawn)}
              aria-pressed={selectedSpawn?.id === spawn.id}
              type="button"
            >
              <Torch size="2.4em" extraClass="spawn-icon" />
              <div class="spawn-item-content">
                <h3>{spawn.name || 'Unnamed Spawn'}</h3>
                {#if spawn.description}
                  <p class="spawn-description">{spawn.description}</p>
                {/if}
                <div class="spawn-meta">
                  <span class="spawn-race">{spawn.race || 'any'}</span>
                  <span class="spawn-coords">
                    {#if spawn.x !== undefined && spawn.y !== undefined}
                      ({spawn.x}, {spawn.y})
                    {:else if spawn.position}
                      ({spawn.position.x}, {spawn.position.y})
                    {/if}
                  </span>
                </div>
              </div>
            </button>
          {/each}
        </div>
          
        <div class="spawn-actions">
          <button 
            class="spawn-button" 
            disabled={loading || !selectedSpawn} 
            onclick={() => confirm(selectedSpawn)}
          >
            {#if loading}
              <span class="spinner"></span> Spawning...
            {:else if deathMessage}
              Respawn
            {:else}
              Spawn Here
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .spawn-menu-wrapper {
    position: fixed;
    inset: 0;
    background: var(--chrome-backdrop);
    backdrop-filter: blur(0.25em);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1200;
    pointer-events: all;
  }

  .spawn-menu {
    position: relative;
    width: 90%;
    max-width: 480px;
    max-height: 88vh;
    background: linear-gradient(160deg, var(--chrome-panel-a), var(--chrome-panel-b));
    border: 0.075em solid var(--chrome-gold-border);
    box-shadow: 0 0.5em 3em var(--chrome-shadow), inset 0 1px 0 var(--chrome-gold-soft);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: var(--font-body);
    color: var(--chrome-text);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.85em 1.2em;
    border-bottom: 0.075em solid var(--chrome-gold-border);
    background: var(--chrome-gold-soft);
  }

  h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 0.82em;
    font-weight: 400;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--chrome-gold);
  }

  .content {
    padding: 1em 1.2em;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--chrome-gold-border) transparent;
    max-height: calc(88vh - 3.5em);
  }

  .race-header {
    display: flex;
    align-items: center;
    gap: 0.8em;
    margin-bottom: 1em;
    padding-bottom: 0.8em;
    border-bottom: 0.075em solid var(--chrome-hairline);
  }

  .death-message-container {
    margin-bottom: 1em;
    padding: 0.9em 1em;
    background: rgba(139, 32, 32, 0.12);
    border: 0.075em solid rgba(139, 32, 32, 0.35);
    text-align: center;
    animation: deathPulse 2.4s ease-in-out infinite alternate;
  }

  @keyframes deathPulse {
    from { background: rgba(139, 32, 32, 0.08); }
    to   { background: rgba(139, 32, 32, 0.18); }
  }

  .death-message {
    margin: 0;
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.95em;
    color: var(--color-wax-red);
  }

  .race-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .welcome-text {
    font-family: var(--font-editorial, serif);
    font-size: 0.95em;
    color: var(--chrome-text-dim);
  }
  .welcome-text strong { color: var(--chrome-text); }

  :global(.spawn-race-icon) {
    width: 2em;
    height: 2em;
    fill: var(--chrome-gold);
    stroke: none;
  }

  .error-message {
    background: rgba(139, 32, 32, 0.12);
    color: var(--color-wax-red);
    border: 0.075em solid rgba(139, 32, 32, 0.35);
    padding: 0.55em 0.8em;
    margin: 0.6em 0;
    font-size: 0.85em;
    text-align: center;
  }

  .spawn-list {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
    max-height: 18em;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--chrome-gold-border) transparent;
    margin-bottom: 1em;
  }

  .spawn-item {
    background: var(--chrome-field-bg);
    border: 0.075em solid var(--chrome-border);
    padding: 0.75em 0.9em;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-align: left;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.8em;
    font-family: inherit;
    color: inherit;
  }

  .spawn-item:hover {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold-border);
  }

  .spawn-item:focus-visible {
    outline: 0.12em solid var(--chrome-gold);
    outline-offset: 0.1em;
  }

  .spawn-item.selected {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold);
    box-shadow: inset 0.2em 0 0 var(--chrome-gold);
  }

  .spawn-item-content { flex: 1; min-width: 0; }

  :global(.spawn-icon) {
    color: var(--chrome-gold);
    flex-shrink: 0;
  }

  .spawn-item h3 {
    margin: 0 0 0.3em;
    font-family: var(--font-display);
    font-size: 0.82em;
    font-weight: 400;
    letter-spacing: 0.1em;
    color: var(--chrome-text);
  }

  .spawn-description {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.82em;
    margin: 0 0 0.4em;
    color: var(--chrome-text-faint);
  }

  .spawn-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5em;
  }

  .spawn-race {
    font-family: var(--font-mono);
    font-size: 0.7em;
    letter-spacing: 0.1em;
    color: var(--chrome-gold);
    background: var(--chrome-gold-soft);
    padding: 0.15em 0.5em;
    text-transform: uppercase;
  }

  .spawn-coords {
    font-family: var(--font-mono);
    font-size: 0.7em;
    color: var(--chrome-text-faint);
    letter-spacing: 0.06em;
  }

  .spawn-actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5em;
  }

  .spawn-button {
    position: relative;
    font-family: var(--font-display);
    font-size: 0.75em;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: var(--chrome-gold);
    color: var(--color-ink-900);
    border: 0.075em solid var(--chrome-gold);
    padding: 0.7em 2em;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    min-width: 12em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
  }

  .spawn-button:hover:not(:disabled) {
    background: var(--color-gold-pale);
    border-color: var(--color-gold-pale);
  }

  .spawn-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .spawn-menu-wrapper.loading { cursor: wait; }

  .spinner {
    width: 0.9em;
    height: 0.9em;
    border: 0.12em solid var(--chrome-hairline);
    border-top-color: var(--color-ink-900);
    border-radius: 50%;
    animation: spin 0.85s linear infinite;
    display: inline-block;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .spawn-menu { width: 95%; max-height: 82vh; }
  }
</style>
