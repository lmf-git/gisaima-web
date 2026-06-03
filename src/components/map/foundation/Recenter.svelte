<script>
  import { moveTarget, targetStore, map, currentPlayerPosition } from '../../../lib/stores/map';
  import { game } from '../../../lib/stores/game';
  import Torch from '../../icons/Torch.svelte';
  // Import race icons
  import Human from '../../icons/Human.svelte';
  import Elf from '../../icons/Elf.svelte';
  import Dwarf from '../../icons/Dwarf.svelte';
  import Goblin from '../../icons/Goblin.svelte';
  import Fairy from '../../icons/Fairy.svelte';
  
  // Calculate distance between two points
  function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  // Track recenter target info
  let recenterTarget = $state(null);
  let distance = $state(0);
  let targetType = $state('spawn'); // 'player' or 'spawn'
  let playerInMainView = $state(true); // Track if player is in main view
  
  // Store player race for icon selection
  let playerRace = $state(null);
  
  $effect(() => {
    // Update player race whenever game state changes
    playerRace = $game.player?.race?.toLowerCase() || null;
  });

  // Check if player position is in main view - more efficient calculation
  $effect(() => {
    const playerLocation = $currentPlayerPosition;
    if (!$game?.player?.alive || !playerLocation) {
      playerInMainView = false;
      return;
    }

    // Calculate main view boundaries based on current target and grid dimensions
    const halfCols = Math.floor($map.cols / 2);
    const halfRows = Math.floor($map.rows / 2);

    const minX = $targetStore.x - halfCols;
    const maxX = $targetStore.x + halfCols;
    const minY = $targetStore.y - halfRows;
    const maxY = $targetStore.y + halfRows;

    // Check if player's location is within these boundaries
    playerInMainView = (
      playerLocation.x >= minX &&
      playerLocation.x <= maxX &&
      playerLocation.y >= minY &&
      playerLocation.y <= maxY
    );
  });

  $effect(() => {
    // Get current target coordinates
    const tx = $targetStore.x;
    const ty = $targetStore.y;

    // Check for player location first
    const playerLocation = $currentPlayerPosition;
    if ($game?.player?.alive && playerLocation) {
      
      // Calculate distance to player
      const dist = getDistance(tx, ty, playerLocation.x, playerLocation.y);
      
      // Update state with player as target
      recenterTarget = { 
        x: playerLocation.x, 
        y: playerLocation.y,
        type: 'player'
      };
      distance = dist;
      targetType = 'player';
      return;
    }
    
    // Fall back to spawn points if player location not available
    const playerRaceValue = $game.player?.race?.toLowerCase();
    const world = $game.worlds[$game.worldKey];
    
    // Skip if data is missing
    if (!world || !playerRaceValue) {
      recenterTarget = null;
      distance = 0;
      return;
    }
    
    // Get spawns from world data
    const spawns = world.spawns ? Object.values(world.spawns) : [];
    
    // Filter spawns by race
    const raceSpawns = spawns.filter(spawn => 
      spawn.race?.toLowerCase() === playerRaceValue
    );
    
    if (raceSpawns.length === 0) {
      // No spawns for this race found
      recenterTarget = null;
      distance = 0;
      return;
    }
    
    // Find nearest spawn
    let closest = null;
    let minDistance = Infinity;
    
    for (const spawn of raceSpawns) {
      // Get spawn coordinates
      const spawnX = spawn.x ?? spawn.position?.x ?? 0;
      const spawnY = spawn.y ?? spawn.position?.y ?? 0;
      
      const dist = getDistance(tx, ty, spawnX, spawnY);
      
      if (dist < minDistance) {
        minDistance = dist;
        closest = spawn;
      }
    }
    
    // Update state with spawn as target
    if (closest) {
      const spawnX = closest.x ?? closest.position?.x ?? 0;
      const spawnY = closest.y ?? closest.position?.y ?? 0;
      
      recenterTarget = {
        x: spawnX,
        y: spawnY,
        spawn: closest,
        type: 'spawn'
      };
      distance = minDistance;
      targetType = 'spawn';
    } else {
      recenterTarget = null;
      distance = 0;
    }
  });
  
  // Handle recenter click
  function recenter() {
    if (!recenterTarget) return;
    moveTarget(recenterTarget.x, recenterTarget.y);
  }
</script>

{#if recenterTarget && (targetType === 'player' ? !playerInMainView : true) && $game?.player?.alive}
  <button 
    class="recenter-button" 
    onclick={recenter}
    aria-label={targetType === 'player' ? "Return to player" : "Return to spawn point"}>
    
    {#if targetType === 'player' && playerRace}
      {#if playerRace === 'human'}
        <Human extraClass="race-icon-button" size="1.2em" />
      {:else if playerRace === 'elf'}
        <Elf extraClass="race-icon-button" size="1.2em" />
      {:else if playerRace === 'dwarf'}
        <Dwarf extraClass="race-icon-button" size="1.2em" />
      {:else if playerRace === 'goblin'}
        <Goblin extraClass="race-icon-button" size="1.2em" />
      {:else if playerRace === 'fairy'}
        <Fairy extraClass="race-icon-button" size="1.2em" />
      {:else}
        <Torch extraClass="torch-icon-button" size="1.2em" />
      {/if}
    {:else}
      <Torch extraClass="torch-icon-button" size="1.2em" />
    {/if}
    
    <span>{targetType === 'player' ? 'Return to player' : 'Return to spawn'}</span>
  </button>
{/if}

<style>
  .recenter-button {
    position: fixed;
    bottom: 2em;
    left: 1em;
    background: rgba(14, 19, 32, 0.85);
    border: 1px solid rgba(176, 141, 74, 0.4);
    border-radius: 0;
    color: var(--color-gold-pale);
    padding: 0.55em 0.9em;
    font-family: var(--font-display);
    font-size: 0.72em;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.6em;
    text-shadow: none;
    transition: background 0.15s ease, border-color 0.15s ease;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 998;
    box-shadow: 0 0.6em 1.6em rgba(0, 0, 0, 0.3);
    animation: pulseButton 2.4s infinite alternate;
  }

  .recenter-button:hover {
    background: rgba(176, 141, 74, 0.18);
    border-color: var(--color-gold-pale);
  }

  /* On mobile the LeftRail becomes a 52px bottom tab bar; lift above it. */
  @media (max-width: 700px) {
    .recenter-button {
      bottom: calc(52px + 1em + env(safe-area-inset-bottom));
      left: 1em;
    }
  }

  @keyframes pulseButton {
    0% { transform: scale(1); }
    100% { transform: scale(1.04); }
  }

  :global(.torch-icon-button) {
    width: 1.1em;
    height: 1.1em;
    fill: var(--color-aged-gold);
    filter: drop-shadow(0 0 4px rgba(212, 177, 112, 0.5));
  }

  :global(.race-icon-button) {
    width: 1.1em;
    height: 1.1em;
    fill: var(--color-gold-pale);
    filter: none;
  }
</style>
