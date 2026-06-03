<script>
  import { onMount, onDestroy } from 'svelte';

  import { ACHIEVEMENTS } from 'gisaima-shared/definitions/ACHIEVEMENTS.js';

  import { currentPlayer } from '../../../lib/stores/game.js';

  import Trophy from '../../icons/Trophy.svelte';

  const {
    onClose = () => {},
    closing = false,
  } = $props();

  let selectedCategory = $state('all');

  const achievementDefinitions = $state(ACHIEVEMENTS);

  const playerAchievements = $derived($currentPlayer?.achievements || {});

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'explore', label: 'Explore' },
    { id: 'combat', label: 'Combat' },
    { id: 'items', label: 'Items' },
    { id: 'social', label: 'Social' }
  ];

  const processedAchievements = $derived(
    Object.entries(achievementDefinitions).map(([id, achievement]) => {
      const isUnlocked = playerAchievements[id] === true;
      const isFiltered = selectedCategory === 'all' || achievement.category === selectedCategory;
      const shouldShow = isUnlocked || !achievement.hidden;
      return {
        ...achievement,
        id,
        unlocked: isUnlocked,
        visible: isFiltered && shouldShow,
        date: playerAchievements[id + '_date'] || null
      };
    })
  );

  const filteredAchievements = $derived(processedAchievements.filter(a => a.visible));

  const unlockedCount = $derived(
    Object.keys(playerAchievements).filter(key => !key.endsWith('_date')).length
  );

  const totalCount = $derived(
    Object.values(achievementDefinitions).filter(a => !a.hidden).length
  );

  function selectCategory(categoryId) { selectedCategory = categoryId; }

  function close() {
    localStorage.setItem('achievements_closed', 'true');
    onClose();
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(timestamp));
  }
</script>

<div class="achievements-panel">
  <div class="ach-dossier-count">{unlockedCount} / {totalCount} unlocked</div>

  <div class="ach-categories">
    {#each categories as category}
      <button
        class="ach-cat-btn"
        class:active={selectedCategory === category.id}
        onclick={() => selectCategory(category.id)}
      >
        {category.label}
      </button>
    {/each}
  </div>

  <div class="ach-content">
    {#if filteredAchievements.length === 0}
      <div class="ach-empty">No achievements in this category.</div>
    {:else}
      <ul class="ach-list">
        {#each filteredAchievements as achievement}
          <li class="ach-item" class:unlocked={achievement.unlocked} class:locked={!achievement.unlocked}>
            <div class="ach-icon">
              {#if achievement.unlocked}
                <Trophy extraClass="ach-trophy" />
              {:else}
                <span class="ach-lock">?</span>
              {/if}
            </div>
            <div class="ach-details">
              <div class="ach-name">
                {achievement.unlocked || !achievement.hiddenTitle ? achievement.title : 'Hidden Achievement'}
              </div>
              <div class="ach-desc">
                {achievement.unlocked || !achievement.hiddenDesc ? achievement.description : 'Complete this hidden achievement to reveal its details.'}
              </div>
              {#if achievement.unlocked && achievement.date}
                <div class="ach-date">Unlocked: {formatDate(achievement.date)}</div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .achievements-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    color: var(--chrome-text);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
  }

  .ach-dossier-count {
    font-family: var(--font-mono);
    font-size: 0.72em;
    color: var(--chrome-text-faint);
    padding: 0.5em 1em 0.25em;
    flex-shrink: 0;
  }

  /* Trophy icon in header */
  .achievements-panel :global(.trophy-icon) {
    width: 1em;
    height: 1em;
    color: var(--chrome-gold);
  }

  /* Category filter strip */
  .ach-categories {
    display: flex;
    gap: 0.4em;
    padding: 0.6em 1em;
    border-bottom: 0.075em solid var(--chrome-hairline);
    flex-wrap: wrap;
    flex-shrink: 0;
    background: transparent;
  }

  .ach-cat-btn {
    padding: 0.25em 0.7em;
    background: var(--chrome-field-bg);
    border: 0.075em solid var(--chrome-field-border);
    color: var(--chrome-text-dim);
    font-family: var(--font-display);
    font-size: 0.62em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .ach-cat-btn:hover {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold-border);
    color: var(--chrome-text);
  }
  .ach-cat-btn.active {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold);
    color: var(--chrome-gold);
  }

  /* Scrollable content */
  .ach-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.75em 1em;
    scrollbar-width: thin;
    scrollbar-color: var(--chrome-gold-border) transparent;
  }

  .ach-empty {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    color: var(--chrome-text-faint);
    font-size: 0.82em;
    text-align: center;
    padding: 2em 0;
  }

  .ach-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .ach-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75em;
    padding: 0.65em 0.75em;
    background: var(--chrome-card);
    border: 0.075em solid var(--chrome-gold-soft);
    transition: background 0.12s, border-color 0.12s;
  }
  .ach-item:hover {
    background: var(--chrome-gold-soft);
    border-color: var(--chrome-gold-border);
  }

  .ach-item.unlocked {
    border-left: 0.2em solid var(--chrome-gold);
    background: var(--chrome-gold-soft);
  }
  .ach-item.locked {
    opacity: 0.65;
  }

  .ach-icon {
    width: 1.8em;
    height: 1.8em;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--chrome-gold);
  }

  .achievements-panel :global(.ach-trophy) {
    width: 1.4em;
    height: 1.4em;
    color: var(--chrome-gold);
  }

  .ach-lock {
    width: 1.4em;
    height: 1.4em;
    background: var(--chrome-field-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 0.75em;
    letter-spacing: 0.1em;
    color: var(--chrome-text-faint);
  }

  .ach-details { flex: 1; min-width: 0; }

  .ach-name {
    font-family: var(--font-display);
    font-size: 0.76em;
    letter-spacing: 0.08em;
    color: var(--chrome-text);
    margin-bottom: 0.2em;
  }

  .ach-desc {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.72em;
    color: var(--chrome-text-dim);
    line-height: 1.4;
  }

  .ach-date {
    margin-top: 0.3em;
    font-family: var(--font-mono);
    font-size: 0.62em;
    color: var(--chrome-gold);
    letter-spacing: 0.06em;
  }
</style>
