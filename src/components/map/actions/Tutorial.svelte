<script>
  import { onMount, onDestroy } from 'svelte';
  import { ACHIEVEMENTS } from 'gisaima-shared/definitions/ACHIEVEMENTS.js';
  import { currentPlayer } from '../../../lib/stores/game.js';
  import Trophy from '../../icons/Trophy.svelte';

  const {
    onClose = () => {},
    onOpenAchievements = () => {},
  } = $props();

  // Steps: each describes one tutorial beat.
  // `selector` targets a DOM element to spotlight; null = centred card only.
  // `achievement` links to an ACHIEVEMENTS key to show unlock status.
  // `wheelAction` (the action's aria-label in the wheel) turns the step into an
  // interactive beat: the player must open the action wheel on their tile and
  // pick that action. The tutorial waits for the click instead of offering Next.
  const STEPS = [
    {
      id: 'welcome',
      title: 'Welcome to Gisaima',
      body: 'An open-world strategy MMO with procedurally generated maps, territory control, and real-time interaction. This guide walks you through the first things to try.',
      selector: null,
      achievement: null,
    },
    {
      id: 'center-tile',
      title: 'Your Position',
      body: 'The highlighted tile in the centre of the map is where you are. Tap or click it to open the action wheel and choose what to do here.',
      selector: '.tile.center',
      achievement: null,
    },
    {
      id: 'mobilise',
      title: 'Mobilise a Group',
      body: 'Mobilise gathers units into a travelling group. Groups are how you explore and expand.',
      selector: '.tile.center',
      wheelAction: 'Mobilise',
      achievement: 'mobilised',
    },
    {
      id: 'movement',
      title: 'Draw a Path',
      body: 'With a group mobilised, Move lets you draw a path across the map and send them off.',
      selector: '.tile.center',
      wheelAction: 'Move',
      achievement: 'first_steps',
    },
    {
      id: 'gather',
      title: 'Gather Resources',
      body: 'Gather collects resources from the terrain around your group. Resources power everything.',
      selector: '.tile.center',
      wheelAction: 'Gather',
      achievement: 'first_gather',
    },
    {
      id: 'recruit',
      title: 'Recruit Units',
      body: 'At a spawn structure, Recruit adds units to your roster. More units means stronger groups.',
      selector: '.tile.center',
      wheelAction: 'Recruit',
      achievement: 'first_recruit',
    },
    {
      id: 'craft',
      title: 'Craft Items',
      body: 'At a workshop, Craft creates items that boost your characters and units.',
      selector: '.tile.center',
      wheelAction: 'Craft',
      achievement: 'first_craft',
    },
    {
      id: 'chat',
      title: 'Talk to Others',
      body: 'Use the chat button in the top right to send messages to other players in this world. Alliances are often forged in conversation.',
      selector: '[aria-label="Open chat"], .chat-button, [aria-label="Chat"]',
      achievement: 'first_message',
    },
    {
      id: 'combat',
      title: 'Enter Combat',
      body: 'Move a group onto a tile occupied by enemies to start a battle. Open the wheel and choose Attack when an enemy shares your tile.',
      selector: '.tile.center',
      wheelAction: 'Attack',
      achievement: 'first_attack',
    },
    {
      id: 'achievements',
      title: 'Track Your Progress',
      body: 'Open the Achievements panel to see everything you\'ve unlocked and what to try next. Good luck — the world is waiting.',
      selector: '.achievements-button, [aria-label="Show achievements"]',
      achievement: null,
    },
  ];

  // The open action wheel (Peek.svelte) renders as `.peek-container`; each action
  // sector carries `aria-label="<Label>"`. These let us detect wheel state and
  // spotlight the exact action a step asks for.
  const WHEEL_SELECTOR = '.peek-container';
  const wheelActionSelector = (label) => `${WHEEL_SELECTOR} [aria-label="${label}"]`;

  const totalSteps = STEPS.length;

  const savedStep = typeof localStorage !== 'undefined'
    ? parseInt(localStorage.getItem('tutorial-step') || '0', 10)
    : 0;

  let stepIndex = $state(Math.min(savedStep, totalSteps - 1));
  let spotlightRect = $state(null);
  let isSnapping = $state(false);
  // True while the action wheel (Peek) is open on screen.
  let wheelOpen = $state(false);

  const step = $derived(STEPS[stepIndex]);
  const playerAchievements = $derived($currentPlayer?.achievements || {});
  const stepAchievement = $derived(
    step.achievement ? ACHIEVEMENTS[step.achievement] : null
  );
  const stepUnlocked = $derived(
    step.achievement ? !!playerAchievements[step.achievement] : false
  );

  // Interactive steps wait for the player to open the wheel and pick an action
  // instead of showing a Next button.
  const isInteractive = $derived(!!step.wheelAction);
  // The live call-to-action shown beneath the step body for interactive steps.
  const stepCue = $derived(
    !isInteractive
      ? null
      : wheelOpen
        ? `Choose ${step.wheelAction} from the wheel.`
        : 'Tap the highlighted tile to open the action wheel.'
  );

  function resolveSelector(selector) {
    if (!selector) return null;
    const parts = selector.split(',').map(s => s.trim());
    for (const s of parts) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  // For interactive steps the spotlight target depends on wheel state: the tile
  // until the wheel opens, then the specific action sector inside it.
  function currentSelector() {
    if (isInteractive) {
      if (wheelOpen) {
        const actionEl = document.querySelector(wheelActionSelector(step.wheelAction));
        if (actionEl) return wheelActionSelector(step.wheelAction);
      }
      return step.selector;
    }
    return step.selector;
  }

  function updateSpotlight() {
    // Keep the wheel-open flag in sync with the DOM each pass.
    wheelOpen = !!document.querySelector(WHEEL_SELECTOR);

    const selector = currentSelector();
    if (!selector) {
      spotlightRect = null;
      return;
    }
    const el = resolveSelector(selector);
    if (!el) {
      spotlightRect = null;
      return;
    }
    const r = el.getBoundingClientRect();
    const PAD = 8;
    spotlightRect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
  }

  function goTo(index) {
    stepIndex = Math.max(0, Math.min(index, totalSteps - 1));
    localStorage.setItem('tutorial-step', String(stepIndex));
    updateSpotlight();
  }

  function next() {
    if (stepIndex < totalSteps - 1) goTo(stepIndex + 1);
    else finish();
  }

  // Advance after the player engages the action a step asked for. A short delay
  // lets the wheel close and the action panel open before the card moves on.
  let advanceTimer = null;
  function advanceFromAction() {
    if (advanceTimer) return;
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      next();
    }, 450);
  }

  // Watch every click: if it lands on the action sector the current step wants,
  // treat the step as satisfied and move forward.
  function onDocClick(e) {
    if (!isInteractive) return;
    const target = e.target instanceof Element
      ? e.target.closest(`[aria-label="${step.wheelAction}"]`)
      : null;
    if (target && target.closest(WHEEL_SELECTOR)) {
      advanceFromAction();
    }
  }

  function prev() {
    if (stepIndex > 0) goTo(stepIndex - 1);
  }

  function finish() {
    localStorage.setItem('tutorial-state', 'closed');
    onClose();
  }

  function skip() {
    finish();
  }

  function openAchievements() {
    finish();
    onOpenAchievements();
  }

  // Recompute spotlight when step changes and on resize.
  let rafId = null;
  function scheduleSpotlight() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { updateSpotlight(); rafId = null; });
  }

  // Poll so wheel open/close and action-sector positions (driven by map
  // interactions outside this component) keep the spotlight in sync.
  let pollId = null;

  onMount(() => {
    updateSpotlight();
    window.addEventListener('resize', scheduleSpotlight);
    document.addEventListener('click', onDocClick, true);
    pollId = setInterval(scheduleSpotlight, 150);
    return () => {
      window.removeEventListener('resize', scheduleSpotlight);
      document.removeEventListener('click', onDocClick, true);
      if (pollId) clearInterval(pollId);
      if (rafId) cancelAnimationFrame(rafId);
      if (advanceTimer) clearTimeout(advanceTimer);
    };
  });

  $effect(() => {
    // Re-spotlight when step changes (after DOM settles).
    void stepIndex;
    scheduleSpotlight();
  });

  $effect(() => {
    // For interactive steps, unlocking the linked achievement also completes the
    // beat — covers actions that finish asynchronously (e.g. movement, combat).
    if (isInteractive && stepUnlocked) advanceFromAction();
  });

  // Card positioning: prefer above the spotlight, fall back to below, or centred.
  const cardStyle = $derived.by(() => {
    if (!spotlightRect) return 'top:50%;left:50%;transform:translate(-50%,-50%)';
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const cardH = 220;
    const cardW = Math.min(340, vw - 32);
    const spaceAbove = spotlightRect.top;
    const spaceBelow = vh - (spotlightRect.top + spotlightRect.height);
    let top, left;
    if (spaceAbove >= cardH + 16) {
      top = spotlightRect.top - cardH - 12;
    } else if (spaceBelow >= cardH + 16) {
      top = spotlightRect.top + spotlightRect.height + 12;
    } else {
      top = Math.max(16, (vh - cardH) / 2);
    }
    left = Math.max(16, Math.min(spotlightRect.left + spotlightRect.width / 2 - cardW / 2, vw - cardW - 16));
    return `top:${top}px;left:${left}px;width:${cardW}px`;
  });
</script>

<!-- Full-screen overlay -->
<div
  class="tutorial-overlay"
  role="dialog"
  aria-modal="true"
  aria-label="Interactive tutorial"
  onkeydown={e => { if (e.key === 'Escape') skip(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); }}
  tabindex="-1"
>
  <!-- Dark backdrop with spotlight hole via SVG mask -->
  <svg class="backdrop" aria-hidden="true">
    <defs>
      <mask id="spotlight-mask">
        <!-- White = show backdrop (dark), black = hide backdrop (reveal) -->
        <rect width="100%" height="100%" fill="white" />
        {#if spotlightRect}
          <rect
            x={spotlightRect.left}
            y={spotlightRect.top}
            width={spotlightRect.width}
            height={spotlightRect.height}
            rx="4"
            fill="black"
          />
        {/if}
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#spotlight-mask)" />
  </svg>

  {#if spotlightRect}
    <!-- Visible border around spotlight target -->
    <div
      class="spotlight-border"
      style="top:{spotlightRect.top}px;left:{spotlightRect.left}px;width:{spotlightRect.width}px;height:{spotlightRect.height}px"
    ></div>
  {/if}

  <!-- Instruction card -->
  <div class="tutorial-card" style={cardStyle}>
    <div class="card-progress">
      {#each STEPS as _, i}
        <button
          class="progress-dot"
          class:active={i === stepIndex}
          class:done={i < stepIndex}
          onclick={() => goTo(i)}
          aria-label="Go to step {i + 1}"
        ></button>
      {/each}
    </div>

    <div class="card-body">
      <h2 class="card-title">{step.title}</h2>
      <p class="card-text">{step.body}</p>

      {#if stepCue}
        <p class="card-cue" class:on-wheel={wheelOpen}>{stepCue}</p>
      {/if}

      {#if stepAchievement}
        <div class="card-achievement" class:unlocked={stepUnlocked}>
          <span class="ach-icon-wrap">
            {#if stepUnlocked}
              <Trophy extraClass="ach-icon-svg" />
            {:else}
              <span class="ach-lock-glyph">?</span>
            {/if}
          </span>
          <span class="ach-label">
            {stepUnlocked ? stepAchievement.title + ' — Unlocked' : stepAchievement.title}
          </span>
        </div>
      {/if}
    </div>

    <div class="card-actions">
      <div class="card-nav">
        <button class="nav-btn" onclick={prev} disabled={stepIndex === 0} aria-label="Previous step">
          ‹ Prev
        </button>
        {#if isInteractive}
          <!-- Interactive steps complete by doing, not by pressing Next. -->
          <span class="nav-waiting" aria-live="polite">Waiting for you…</span>
        {:else if stepIndex < totalSteps - 1}
          <button class="nav-btn primary" onclick={next} aria-label="Next step">
            Next ›
          </button>
        {:else}
          <button class="nav-btn primary" onclick={openAchievements} aria-label="View achievements">
            View Achievements
          </button>
        {/if}
      </div>
      <button class="skip-btn" onclick={skip}>Skip tutorial</button>
    </div>
  </div>
</div>

<style>
  .tutorial-overlay {
    position: fixed;
    inset: 0;
    z-index: 8000;
    /* Clicks pass through to the map/wheel; only the card captures input so the
       player can open the wheel and pick actions while the tutorial guides. */
    pointer-events: none;
  }
  .tutorial-overlay:focus { outline: none; }

  .backdrop {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .spotlight-border {
    position: fixed;
    border: 2px solid var(--chrome-gold, #b08d4a);
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(176,141,74,0.3), 0 0 12px 2px rgba(176,141,74,0.25);
    pointer-events: none;
    transition: top 0.18s ease, left 0.18s ease, width 0.18s ease, height 0.18s ease;
    animation: pulse-border 2s ease-in-out infinite;
  }

  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 1px rgba(176,141,74,0.3), 0 0 10px 2px rgba(176,141,74,0.2); }
    50%       { box-shadow: 0 0 0 1px rgba(176,141,74,0.5), 0 0 18px 4px rgba(176,141,74,0.4); }
  }

  /* ── Card ── */
  .tutorial-card {
    position: fixed;
    background: var(--chrome-bg, #141820);
    border: 1px solid var(--chrome-gold-border, #5a4520);
    color: var(--chrome-text, #e8e0cc);
    font-family: var(--font-ui, 'Inter', system-ui, sans-serif);
    box-shadow: 0 4px 32px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    gap: 0;
    z-index: 8001;
    max-width: 340px;
    min-width: 260px;
    /* Re-enable input on the card itself (overlay is click-through). */
    pointer-events: auto;
  }

  /* Progress dots */
  .card-progress {
    display: flex;
    gap: 0.4em;
    padding: 0.7em 0.9em 0.4em;
    align-items: center;
  }

  .progress-dot {
    width: 0.55em;
    height: 0.55em;
    border-radius: 50%;
    background: var(--chrome-text-faint, #4a4030);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background 0.15s, transform 0.15s;
    flex-shrink: 0;
  }
  .progress-dot.done { background: var(--chrome-gold-border, #5a4520); }
  .progress-dot.active {
    background: var(--chrome-gold, #b08d4a);
    transform: scale(1.3);
  }
  .progress-dot:hover { background: var(--chrome-gold-soft, #2a2010); }

  /* Card body */
  .card-body {
    padding: 0.5em 0.9em 0.7em;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }

  .card-title {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.82em;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--chrome-gold, #b08d4a);
    margin: 0;
  }

  .card-text {
    font-family: var(--font-editorial, serif);
    font-style: italic;
    font-size: 0.78em;
    line-height: 1.5;
    color: var(--chrome-text-dim, #a09070);
    margin: 0;
  }

  /* Live call-to-action for interactive steps */
  .card-cue {
    font-family: var(--font-display, 'Cinzel', serif);
    font-size: 0.7em;
    letter-spacing: 0.06em;
    line-height: 1.4;
    color: var(--chrome-text, #e8e0cc);
    margin: 0;
    padding: 0.4em 0.6em;
    background: var(--chrome-gold-soft, #2a2010);
    border-left: 2px solid var(--chrome-gold, #b08d4a);
  }
  .card-cue.on-wheel {
    border-left-color: var(--color-gold-pale, #d4b170);
    animation: cue-pulse 1.4s ease-in-out infinite;
  }
  @keyframes cue-pulse {
    0%, 100% { background: var(--chrome-gold-soft, #2a2010); }
    50%      { background: var(--chrome-gold-border, #5a4520); }
  }

  /* Achievement badge */
  .card-achievement {
    display: flex;
    align-items: center;
    gap: 0.5em;
    padding: 0.35em 0.6em;
    background: var(--chrome-card, #1a1e28);
    border: 1px solid var(--chrome-gold-soft, #2a2010);
    opacity: 0.65;
    transition: opacity 0.2s, border-color 0.2s;
  }
  .card-achievement.unlocked {
    opacity: 1;
    border-color: var(--chrome-gold, #b08d4a);
  }

  .ach-icon-wrap {
    width: 1.4em;
    height: 1.4em;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--chrome-gold, #b08d4a);
    flex-shrink: 0;
  }
  :global(.ach-icon-svg) {
    width: 1.1em;
    height: 1.1em;
  }
  .ach-lock-glyph {
    font-family: var(--font-display, serif);
    font-size: 0.75em;
    color: var(--chrome-text-faint, #4a4030);
  }
  .ach-label {
    font-family: var(--font-mono, monospace);
    font-size: 0.65em;
    letter-spacing: 0.08em;
    color: var(--chrome-text-dim, #a09070);
  }
  .card-achievement.unlocked .ach-label { color: var(--chrome-gold, #b08d4a); }

  /* Card actions */
  .card-actions {
    border-top: 1px solid var(--chrome-hairline, #252830);
    padding: 0.6em 0.9em;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .card-nav {
    display: flex;
    gap: 0.5em;
  }

  .nav-btn {
    flex: 1;
    padding: 0.4em 0.6em;
    background: var(--chrome-field-bg, #1a1e28);
    border: 1px solid var(--chrome-field-border, #2a2e38);
    color: var(--chrome-text-dim, #a09070);
    font-family: var(--font-display, serif);
    font-size: 0.65em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }
  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .nav-btn:not(:disabled):hover {
    background: var(--chrome-gold-soft, #2a2010);
    border-color: var(--chrome-gold-border, #5a4520);
    color: var(--chrome-text, #e8e0cc);
  }
  .nav-btn.primary {
    background: var(--color-aged-gold, #b08d4a);
    border-color: var(--color-aged-gold, #b08d4a);
    color: var(--color-ink-900, #0e1320);
  }
  .nav-btn.primary:hover {
    background: var(--color-gold-pale, #d4b170);
    border-color: var(--color-gold-pale, #d4b170);
    color: var(--color-ink-900, #0e1320);
  }

  .nav-waiting {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    font-size: 0.6em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--chrome-gold, #b08d4a);
    animation: waiting-fade 1.4s ease-in-out infinite;
  }
  @keyframes waiting-fade {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }

  .skip-btn {
    background: none;
    border: none;
    color: var(--chrome-text-faint, #4a4030);
    font-family: var(--font-mono, monospace);
    font-size: 0.6em;
    letter-spacing: 0.08em;
    cursor: pointer;
    text-align: center;
    padding: 0.1em;
    transition: color 0.12s;
  }
  .skip-btn:hover { color: var(--chrome-text-dim, #a09070); }

  @media (max-width: 480px) {
    .tutorial-card {
      min-width: 0;
      width: calc(100vw - 32px) !important;
      left: 16px !important;
    }
  }
</style>
