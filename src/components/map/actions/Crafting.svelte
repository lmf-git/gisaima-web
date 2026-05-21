<script>
  import { apiPost } from '../../../lib/api.js';
  import { fade } from 'svelte/transition';

  import { BUILDINGS } from 'gisaima-shared';
  import { 
    getItemCategories, 
    getAllRecipes
  } from 'gisaima-shared/definitions/ITEMS.js';
  import { game, currentPlayer } from '../../../lib/stores/game.js';

  import Back from '../../icons/Back.svelte';
  import CraftingCategoryIcon from '../../icons/CraftingCategoryIcon.svelte';
  import BuildingIcon from '../../icons/BuildingIcon.svelte';

  // Props
  const {
    structure = null,
    x = 0,
    y = 0,
    onClose = () => {},
    onCraftStart = () => {},
  } = $props();

  // Use $state() for reactive variables
  let recipes = $state(getAllRecipes());
  let loading = $state(false); 
  let error = $state(null);
  let selectedCategory = $state(null);
  let selectedRecipe = $state(null);
  let craftingInProgress = $state(false);
  let successMessage = $state(null);
  let playerInventory = $state([]);
  let currentBuildingLevels = $state({});
  
  // Navigation state - new variable to track current view
  let currentView = $state('categories'); // 'categories', 'recipes', 'details'

  // Replace the hardcoded categories array with the imported function
  const categories = getItemCategories();

  // Simpler effect to just handle player inventory and building levels
  $effect(() => {
    // Get player inventory
    playerInventory = Array.isArray($currentPlayer?.inventory) 
      ? [...$currentPlayer.inventory] 
      : [];
    
    // Extract building levels from structure
    if (structure) {
      const newLevels = {};
      
      // Extract structure level for basic crafting
      newLevels.crafting = structure.level || 1;
      
      // Extract structure features and buildings
      if (structure.features) {
        structure.features.forEach(feature => {
          switch(feature.name) {
            case 'Basic Workshop':
            case 'Advanced Workshop':
              newLevels.workshop = feature.level || 1;
              break;
            case 'Basic Forge':
            case 'Advanced Forge':
              newLevels.smithy = feature.level || 1;
              break;
            case 'Alchemy Lab':
              newLevels.alchemy = feature.level || 1;
              break;
          }
        });
      }
      
      // Set structure type bonuses
      if (structure.type === 'stronghold') {
        newLevels.crafting = Math.max(2, newLevels.crafting);
      } else if (structure.type === 'outpost') {
        newLevels.crafting = Math.max(1, newLevels.crafting);
      }
      
      // Process buildings
      if (structure.buildings) {
        Object.values(structure.buildings).forEach(building => {
          newLevels[building.type] = Math.max(
            newLevels[building.type] || 0,
            building.level || 1
          );
        });
      }
      
      currentBuildingLevels = newLevels;
    }
  });

  // Use $derived for computed values - filter recipes by selected category
  const filteredRecipes = $derived(
    selectedCategory ? recipes.filter(recipe => recipe.category === selectedCategory) : []
  );

  // Navigation functions
  function goToCategories() {
    currentView = 'categories';
    selectedCategory = null;
    selectedRecipe = null;
    successMessage = null;
  }
  
  function selectCategory(categoryId) {
    selectedCategory = categoryId;
    currentView = 'recipes';
    selectedRecipe = null;
    successMessage = null;
  }
  
  function viewRecipeDetails(recipe) {
    selectedRecipe = recipe;
    currentView = 'details';
    successMessage = null;
  }
  
  function goBack() {
    if (currentView === 'details') {
      currentView = 'recipes';
      selectedRecipe = null;
      successMessage = null;
    } else if (currentView === 'recipes') {
      currentView = 'categories';
      selectedCategory = null;
    }
  }

  // Regular functions (not reactive)
  function hasRequiredResources(recipe) {
    if (!recipe?.materials) return false;
    
    // Convert object materials to array format for checking
    const materialsList = Object.entries(recipe.materials).map(([name, quantity]) => ({ 
      name, quantity 
    }));
    
    return materialsList.every(material => {
      const playerItem = playerInventory.find(item => item.name === material.name);
      return playerItem && playerItem.quantity >= material.quantity;
    });
  }
  
  function meetsBuildingLevelRequirements(recipe) {
    // If no building requirements, always return true
    if (!recipe?.requiredBuilding) return true;
    
    // If requirements exist but player is not at a structure, return false
    if (!structure) return false;
    
    const { type, level } = recipe.requiredBuilding;
    const currentLevel = currentBuildingLevels[type] || 0;
    
    return currentLevel >= level;
  }
  
  function getCraftingBlockReason(recipe) {
    if (!recipe) return "No recipe selected";
    
    // Check player crafting level
    const playerCraftingLevel = $currentPlayer?.skills?.crafting?.level || 1;
    if (recipe.requiredLevel && playerCraftingLevel < recipe.requiredLevel) {
      return `Requires crafting level ${recipe.requiredLevel}`;
    }
    
    if (!hasRequiredResources(recipe)) {
      return "Missing required materials";
    }
    
    if (!meetsBuildingLevelRequirements(recipe)) {
      const buildingType = BUILDINGS.getBuildingName(recipe.requiredBuilding?.type);
      const requiredLevel = recipe.requiredBuilding?.level || 1;
      return `Requires a ${buildingType} (Level ${requiredLevel})`;
    }
    
    return null;
  }

  // Update the craftItem function to handle tick-based crafting response
  async function craftItem() {
    if (!selectedRecipe || !canCraft(selectedRecipe)) return;
    
    craftingInProgress = true;
    successMessage = null;
    error = null;
    
    try {
      const result = await apiPost('/actions/startCrafting', {
        recipeId: selectedRecipe.id,
        worldId: $game.worldKey,
        x,
        y
      });

      if (result?.success) {
        // Update local inventory
        if (selectedRecipe.materials) {
          Object.entries(selectedRecipe.materials).forEach(([name, quantity]) => {
            const inventoryItem = playerInventory.find(item => item.name === name);
            if (inventoryItem) {
              inventoryItem.quantity -= quantity;
            }
          });
        }
        
        // Use ticksRequired from the response for the success message
        const ticksRequired = result.ticksRequired || selectedRecipe.craftingTime;
        successMessage = `Successfully started crafting ${selectedRecipe.name}! Will complete in ${formatCraftingTicks(ticksRequired)}.`;
        
        // Trigger any achievement tracking
        onCraftStart(
          $game.worldKey,
          'first_craft',
          true
        );
      } else {
        error = result?.error || 'Unknown crafting error';
      }
    } catch (err) {
      console.error('Error crafting item:', err);
      error = err.message || 'Failed to craft item';
    } finally {
      craftingInProgress = false;
    }
  }
  
  // Format tick formatter
  function formatCraftingTicks(ticks) {
    if (!ticks) return "Instant";
    return ticks === 1 ? `${ticks} tick` : `${ticks} ticks`;
  }
  
  function canCraft(recipe) {
    if (!recipe) return false;
    
    // Check player crafting level
    const playerCraftingLevel = $currentPlayer?.skills?.crafting?.level || 1;
    if (recipe.requiredLevel && playerCraftingLevel < recipe.requiredLevel) {
      return false;
    }
    
    if (!hasRequiredResources(recipe)) {
      return false;
    }
    
    if (!meetsBuildingLevelRequirements(recipe)) {
      return false;
    }
    
    return true;
  }
</script>

<div
  class="crafting-modal">

  {#if currentView !== 'categories'}
    <div class="dossier-back-bar">
      <button class="back-btn" onclick={goBack} aria-label="Go back">
        <Back size="1.1em" />
      </button>
      <span class="dossier-back-label">
        {#if currentView === 'recipes'}
          {categories.find(c => c.id === selectedCategory)?.label || 'Back'}
        {:else}
          {selectedRecipe?.name || 'Back'}
        {/if}
      </span>
    </div>
  {/if}
  
  <div class="content">
    {#if loading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading recipes...</p>
      </div>
    {:else if error}
      <div class="error-message">
        {error}
        <button class="try-again-btn" onclick={() => error = null}>Try Again</button>
      </div>
    {:else}
      <div class="crafting-container">
        <!-- Categories View -->
        {#if currentView === 'categories'}
          <div class="categories-grid" transition:fade={{ duration: 200 }}>
            {#each categories as category}
              <button 
                class="category-card" 
                onclick={() => selectCategory(category.id)}
              >
                <div class="category-icon"><CraftingCategoryIcon category={category.id} size="2em" extraClass="category-svg-icon" /></div>
                <div class="category-name">{category.label}</div>
              </button>
            {/each}
          </div>
        {/if}
        
        <!-- Recipes View -->
        {#if currentView === 'recipes'}
          <div class="recipe-list" transition:fade={{ duration: 200 }}>
            {#if filteredRecipes.length === 0}
              <div class="empty-message">No recipes available in this category.</div>
            {:else}
              {#each filteredRecipes as recipe}
                <div 
                  class="recipe-item" 
                  class:disabled={!canCraft(recipe)}
                  onclick={() => viewRecipeDetails(recipe)}
                  onkeydown={(e) => e.key === 'Enter' && viewRecipeDetails(recipe)}
                  tabindex="0"
                  role="button"
                  aria-disabled={!canCraft(recipe)}
                >
                  <div class="recipe-header">
                    <div class="recipe-name">{recipe.name}</div>
                    <div class="recipe-rarity {recipe.result.rarity || 'common'}">{recipe.result.rarity || 'common'}</div>
                  </div>
                  <div class="recipe-description">{recipe.result.description}</div>
                  
                  {#if !canCraft(recipe)}
                    <div class="recipe-blocked">{getCraftingBlockReason(recipe)}</div>
                  {/if}
                  
                  <div class="recipe-time">
                    <span class="time-icon">⏱</span>
                    {formatCraftingTicks(recipe.craftingTime)}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        {/if}
        
        <!-- Recipe Details View -->
        {#if currentView === 'details' && selectedRecipe}
          <div class="recipe-details" transition:fade={{ duration: 200 }}>
            <h3>{selectedRecipe.name}</h3>
            <p class="recipe-description">{selectedRecipe.result.description}</p>
            
            <div class="recipe-rarity-badge {selectedRecipe.result.rarity || 'common'}">
              {selectedRecipe.result.rarity || 'common'}
            </div>
            
            <h4>Required Materials:</h4>
            <div class="materials-list">
              {#if typeof selectedRecipe.materials === 'object'}
                {#each Object.entries(selectedRecipe.materials) as [name, quantity]}
                  <div 
                    class="material-item"
                    class:insufficient={
                      !playerInventory.find(item => item.name === name && item.quantity >= quantity)
                    }
                  >
                    <span class="material-name">{name}</span>
                    <span class="material-quantity">
                      {(playerInventory.find(item => item.name === name)?.quantity || 0)} / {quantity}
                    </span>
                  </div>
                {/each}
              {/if}
            </div>
            
            {#if selectedRecipe.requiredBuilding}
              <div class="building-requirement">
                <h4>Required Building:</h4>
                <div class="building-info">
                  <span class="building-name">
                    {BUILDINGS.getBuildingName(selectedRecipe.requiredBuilding.type)}
                  </span>
                  <span class="level-info">
                    Level {selectedRecipe.requiredBuilding.level}
                  </span>
                  <span class="status-indicator {meetsBuildingLevelRequirements(selectedRecipe) ? 'available' : 'unavailable'}">
                    {meetsBuildingLevelRequirements(selectedRecipe) ? '✓ Available' : '✗ Not Available'}
                  </span>
                </div>
                <div class="building-icon"><BuildingIcon type={selectedRecipe.requiredBuilding.type} size="2em" extraClass="building-svg-icon" /></div>
                <div class="building-description">
                  {BUILDINGS.getBuildingDescription(selectedRecipe.requiredBuilding.type)}
                </div>
              </div>
            {/if}
            
            <div class="crafting-time-info">
              <h4>Crafting Time:</h4>
              <div class="time-display">
                <span class="tick-count">{formatCraftingTicks(selectedRecipe.craftingTime)}</span>
              </div>
            </div>
            
            {#if successMessage}
              <div class="success-message">{successMessage}</div>
            {/if}
            
            <button 
              class="craft-btn" 
              onclick={craftItem}
              disabled={!canCraft(selectedRecipe) || craftingInProgress}
            >
              {#if craftingInProgress}
                <div class="button-spinner"></div>
                Crafting...
              {:else}
                Craft Item
              {/if}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .crafting-modal {
    display: flex;
    flex-direction: column;
    flex: 1;
    background: transparent;
    color: var(--color-parchment-100);
    font-family: var(--font-body);
  }

  .dossier-back-bar {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.45em 0.9em;
    border-bottom: 0.075em solid rgba(176,141,74,0.15);
    background: rgba(176,141,74,0.04);
  }
  .dossier-back-label {
    font-family: var(--font-display);
    font-size: 0.78em;
    letter-spacing: 0.1em;
    color: var(--color-gold-pale);
  }

  .back-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.3em;
    transition: background 0.2s;
    color: var(--color-parchment-100);
  }

  .back-btn:hover {
    background: rgba(176, 141, 74, 0.12);
  }

  .content {
    padding: 1em;
    overflow-y: auto;
    flex: 1;
    color: var(--color-parchment-200);
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8em, 1fr));
    gap: 1em;
    padding: 0.5em;
  }

  .category-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 1.5em 1em;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: center;
    color: var(--color-parchment-200);
  }

  .category-card:hover {
    background: rgba(176, 141, 74, 0.1);
  }

  .category-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.5em;
    color: var(--color-gold-pale);
  }

  :global(.category-svg-icon) {
    display: block;
  }

  .category-name {
    font-family: var(--font-display);
    font-weight: 500;
    font-size: 0.8em;
    letter-spacing: 0.08em;
    color: var(--color-parchment-200);
  }

  .recipe-list {
    overflow-y: auto;
    padding: 0.5em;
  }

  .recipe-item {
    padding: 0.75rem;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: background-color 0.2s;
    color: var(--color-parchment-100);
  }

  .recipe-item:hover {
    background: rgba(176, 141, 74, 0.1);
  }

  .recipe-item.disabled {
    opacity: 0.7;
    border-color: rgba(91, 26, 31, 0.25);
  }

  .recipe-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .recipe-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-parchment-100);
  }

  .recipe-rarity {
    font-size: 0.75rem;
    padding: 0.1rem 0.3rem;
    text-transform: capitalize;
    font-family: var(--font-display);
    letter-spacing: 0.06em;
  }

  .recipe-rarity.common {
    background: rgba(176, 141, 74, 0.08);
    color: var(--color-parchment-200);
    border: 0.075em solid rgba(176, 141, 74, 0.2);
  }

  .recipe-rarity.uncommon {
    background: rgba(63, 90, 78, 0.15);
    color: #6fcf79;
    border: 0.075em solid rgba(76, 175, 80, 0.25);
  }

  .recipe-rarity.rare {
    background: rgba(176, 141, 74, 0.12);
    color: var(--color-gold-pale);
    border: 0.075em solid rgba(176, 141, 74, 0.3);
  }

  .recipe-rarity.epic {
    background: rgba(91, 26, 31, 0.12);
    color: #c97d85;
    border: 0.075em solid rgba(91, 26, 31, 0.3);
  }

  .recipe-rarity.legendary {
    background: rgba(176, 141, 74, 0.18);
    color: var(--color-gold-pale);
    border: 0.075em solid rgba(212, 177, 112, 0.4);
  }

  .recipe-description {
    font-size: 0.85rem;
    color: var(--color-parchment-200);
    margin-bottom: 0.5rem;
    line-height: 1.3;
    font-family: var(--font-editorial);
    font-style: italic;
  }

  .recipe-blocked {
    font-size: 0.8rem;
    color: #ff5757;
    margin: 0.5rem 0;
    font-weight: 500;
  }

  .recipe-requires {
    font-size: 0.8rem;
    color: var(--color-gold-pale);
    margin-top: 0.25rem;
    font-style: italic;
  }

  .recipe-craft-level {
    font-size: 0.8rem;
    color: var(--color-parchment-200);
    margin-top: 0.25rem;
    font-style: italic;
  }

  .recipe-time {
    font-size: 0.8rem;
    color: rgba(232, 228, 210, 0.55);
    margin-top: 0.5rem;
    display: flex;
    align-items: center;
    font-family: var(--font-mono);
  }

  .time-icon {
    margin-right: 0.3rem;
  }

  .recipe-details {
    padding: 0.5rem;
  }

  .recipe-details h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    font-family: var(--font-display);
    color: var(--color-aged-gold);
    letter-spacing: 0.06em;
  }

  .recipe-details h4 {
    margin: 1.2rem 0 0.5rem;
    font-size: 0.75rem;
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: 0.1rem;
    color: var(--color-aged-gold);
  }

  .recipe-rarity-badge {
    display: inline-block;
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    text-transform: capitalize;
    margin: 0.5rem 0;
    font-family: var(--font-display);
    letter-spacing: 0.06em;
    border: 0.075em solid rgba(176, 141, 74, 0.3);
    background: rgba(176, 141, 74, 0.08);
    color: var(--color-gold-pale);
  }

  .materials-list {
    margin-bottom: 1rem;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 0.5rem;
  }

  .material-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
    color: var(--color-parchment-200);
    border-bottom: 0.075em solid rgba(176, 141, 74, 0.1);
  }

  .material-item:last-child {
    border-bottom: none;
  }

  .material-item.insufficient {
    color: #ff5757;
  }

  .material-quantity {
    font-family: var(--font-mono, monospace);
    font-size: 0.85rem;
  }

  .building-requirement {
    margin-bottom: 1rem;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 0.5rem;
  }

  .building-info {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--color-parchment-200);
  }

  .building-name {
    font-weight: 500;
    color: var(--color-parchment-100);
  }

  .level-info {
    color: var(--color-gold-pale);
    font-weight: 500;
    font-family: var(--font-mono);
  }

  .status-indicator {
    padding: 0.1rem 0.3rem;
    font-size: 0.8rem;
    margin-left: auto;
    font-family: var(--font-display);
    letter-spacing: 0.06em;
  }

  .status-indicator.available {
    color: #6fcf79;
    background: rgba(63, 90, 78, 0.15);
    border: 0.075em solid rgba(76, 175, 80, 0.25);
  }

  .status-indicator.unavailable {
    color: #ff5757;
    background: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.3);
  }

  .building-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.5rem 0;
    color: var(--color-gold-pale);
  }

  :global(.building-svg-icon) {
    display: block;
  }

  .building-description {
    font-size: 0.85rem;
    color: var(--color-parchment-200);
    font-style: italic;
    font-family: var(--font-editorial);
  }

  .crafting-time-info {
    margin-top: 1rem;
    background: rgba(176, 141, 74, 0.05);
    border: 0.075em solid rgba(176, 141, 74, 0.18);
    padding: 0.5rem;
  }

  .time-display {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .tick-count {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--color-gold-pale);
    font-family: var(--font-mono);
  }

  .success-message {
    background-color: rgba(63, 90, 78, 0.15);
    border: 0.075em solid rgba(76, 175, 80, 0.25);
    color: #6fcf79;
    padding: 0.8rem;
    margin: 1rem 0;
    text-align: center;
    font-weight: 500;
  }

  .empty-message {
    padding: 2rem 1rem;
    text-align: center;
    color: rgba(232, 228, 210, 0.55);
    font-style: italic;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 12rem;
    gap: 1rem;
    color: var(--color-parchment-200);
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 0.25rem solid rgba(176, 141, 74, 0.15);
    border-top: 0.25rem solid var(--color-aged-gold);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error-message {
    padding: 1rem;
    text-align: center;
    color: #ff5757;
    background: rgba(91, 26, 31, 0.15);
    border: 0.075em solid rgba(91, 26, 31, 0.3);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .try-again-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 0.075em solid rgba(176, 141, 74, 0.35);
    color: var(--color-parchment-200);
    font-family: var(--font-display);
    cursor: pointer;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: background-color 0.2s;
  }

  .try-again-btn:hover {
    background-color: rgba(176, 141, 74, 0.08);
  }

  .craft-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 0.8rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-ink-900);
    background-color: var(--color-aged-gold);
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 1.5rem;
    font-family: var(--font-display);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .craft-btn:hover:not(:disabled) {
    background-color: var(--color-gold-pale);
  }

  .craft-btn:disabled {
    background-color: rgba(176, 141, 74, 0.3);
    color: rgba(26, 32, 48, 0.5);
    cursor: not-allowed;
    opacity: 0.7;
  }

  .button-spinner {
    width: 1rem;
    height: 1rem;
    border: 0.15rem solid rgba(26, 32, 48, 0.3);
    border-top: 0.15rem solid var(--color-ink-900);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-right: 0.5rem;
  }
</style>
