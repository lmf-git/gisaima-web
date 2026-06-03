<script>
  import { fly, fade } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import { recentUnlock } from '../../../lib/stores/game.js';
  import Trophy from '../../icons/Trophy.svelte';

  // Local state
  let visible = $state(false);
  let achievement = $state(null);
  let timer = null;

  // Effect to handle recentUnlock changes
  $effect(() => {
    if ($recentUnlock) {
      achievement = $recentUnlock;
      visible = true;

      // Clear any existing timer
      if (timer) clearTimeout(timer);
      
      // Set a timer to hide the notification after a few seconds
      timer = setTimeout(() => {
        visible = false;
      }, 5000);
    }
  });

  // Clean up timer when component is destroyed
  onDestroy(() => {
    if (timer) clearTimeout(timer);
  });
</script>

{#if visible && achievement}
  <div 
    class="achievement-notification" 
    in:fly={{ y: -50, duration: 500 }} 
    out:fade={{ duration: 300 }}
  >
    <Trophy extraClass="notification-trophy" />
    <div class="notification-content">
      <h3>Achievement Unlocked!</h3>
      <p class="achievement-title">{achievement.title}</p>
      <p class="achievement-description">{achievement.description}</p>
    </div>
  </div>
{/if}

<style>
  .achievement-notification {
    position: fixed;
    top: 2em;
    left: 50%;
    transform: translateX(-50%);
    background: var(--chrome-bg);
    border: 1px solid var(--chrome-gold-border);
    border-top: 3px solid var(--chrome-gold);
    padding: 0.75em 1em;
    box-shadow: 0 4px 24px var(--chrome-shadow, rgba(0,0,0,0.25));
    display: flex;
    align-items: center;
    gap: 0.85em;
    z-index: 7000;
    max-width: 22em;
    min-width: 16em;
    animation: ach-glow 2.5s ease-in-out infinite;
  }

  @keyframes ach-glow {
    0%, 100% { box-shadow: 0 4px 16px var(--chrome-shadow, rgba(0,0,0,0.25)); }
    50%       { box-shadow: 0 4px 28px var(--chrome-gold-border); }
  }

  .notification-content {
    flex: 1;
    text-align: left;
  }

  .notification-content h3 {
    margin: 0 0 0.15em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.62em;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--chrome-gold);
  }

  .achievement-title {
    margin: 0 0 0.1em;
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.82em;
    letter-spacing: 0.06em;
    color: var(--chrome-text);
  }

  .achievement-description {
    margin: 0;
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.72em;
    color: var(--chrome-text-dim);
    line-height: 1.4;
  }

  :global(.notification-trophy) {
    width: 2em;
    height: 2em;
    color: var(--chrome-gold);
    flex-shrink: 0;
  }
</style>
