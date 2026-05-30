<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { headerRevealed, HEADER_REVEAL_MS } from '$lib/stores/ui.js';

  import GuideSidebar from '../../components/guide/GuideSidebar.svelte';
  import GettingStarted from '../../components/guide/GettingStarted.svelte';
  import MapExploration from '../../components/guide/MapExploration.svelte';
  import TerrainBiomes from '../../components/guide/TerrainBiomes.svelte';
  import Structures from '../../components/guide/Structures.svelte';
  import UnitsGroups from '../../components/guide/UnitsGroups.svelte';
  import Buildings from '../../components/guide/Buildings.svelte';
  import Activities from '../../components/guide/Activities.svelte';
  import Battles from '../../components/guide/Battles.svelte';
  import TradeEconomy from '../../components/guide/TradeEconomy.svelte';
  import CharacterDevelopment from '../../components/guide/CharacterDevelopment.svelte';
  import CommunityPolitics from '../../components/guide/CommunityPolitics.svelte';
  import Races from '../../components/guide/Races.svelte';
  import ItemsInventory from '../../components/guide/ItemsInventory.svelte';
  import StrategyTips from '../../components/guide/StrategyTips.svelte';
  import FAQ from '../../components/guide/FAQ.svelte';

  let activeSection = $state('getting-started');

  // On first load the guide content waits for the header to finish revealing,
  // then cascades in; once the header has revealed, content reveals with no
  // offset. Inherited as a CSS var so each section's transition picks it up.
  // Snapshot once at init (non-reactive) so the offset can't change and snap
  // the in-flight stagger when the header finishes.
  const heroBase = get(headerRevealed) ? 0 : HEADER_REVEAL_MS;

  function scrollToSection(sectionId) {
    activeSection = sectionId;
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }

  onMount(() => {
    if (window.location.hash) {
      const sectionId = window.location.hash.substring(1);
      const section = document.getElementById(sectionId);
      if (section) {
        activeSection = sectionId;
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }

    const sections = document.querySelectorAll('.guide-section');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activeSection = entry.target.id;
      });
    }, { threshold: 0.6 });

    sections.forEach(section => observer.observe(section));

    // Separate reveal observer: fades + slides each section into view. The
    // active-section observer above uses a 0.6 threshold, too high to reveal
    // tall sections, so reveals get their own low-threshold observer.
    const revealEls = document.querySelectorAll('.guide-content .reveal, .guide-section');
    let revealObserver;
    if (typeof IntersectionObserver !== 'undefined') {
      revealObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        }
      }, { threshold: 0.12 });
      revealEls.forEach(el => revealObserver.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('in-view'));
    }

    return () => {
      sections.forEach(section => observer.unobserve(section));
      revealObserver?.disconnect();
    };
  });
</script>

<svelte:head>
  <title>Gisaima - Game Guide</title>
  <meta name="description" content="Learn how to play Gisaima, a strategic territory control game with procedurally generated worlds, dynamic terrain, and multiplayer interactions." />
</svelte:head>

<div class="guide-container">
  <GuideSidebar {activeSection} {scrollToSection} baseDelay={heroBase} />

  <main class="guide-content" style="--reveal-delay: {heroBase}ms">
    <h1 class="reveal">Game Guide</h1>
    <GettingStarted />
    <MapExploration />
    <TerrainBiomes />
    <Structures />
    <UnitsGroups />
    <Buildings />
    <Activities />
    <Battles />
    <TradeEconomy />
    <CharacterDevelopment />
    <CommunityPolitics />
    <Races />
    <ItemsInventory />
    <StrategyTips />
    <FAQ />
  </main>
</div>

<style>
  /* ── Reveal animations ───────────────────────────────────────
     Fade-in + slide-up driven by the IntersectionObserver in <script>, which
     toggles `.in-view`. `--reveal-delay` is inherited from `.guide-content`
     (the header offset on first load), so above-the-fold content waits for the
     header to reveal while later scrolled-in sections come in immediately.
     `.guide-section` is styled :global because it lives inside child
     components — that also keeps Svelte from tree-shaking the rule. */
  .reveal,
  :global(.guide-content .guide-section) {
    opacity: 0;
    transform: translate3d(0, 1.5em, 0);
    transition:
      opacity 1.4s ease,
      transform 1.4s cubic-bezier(0.16, 1, 0.3, 1);
    transition-delay: var(--reveal-delay, 0ms);
    will-change: opacity, transform;
  }
  .reveal:global(.in-view),
  :global(.guide-content .guide-section.in-view) {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal,
    :global(.guide-content .guide-section) {
      opacity: 1;
      transform: none;
      transition: none;
    }
  }

  .guide-container {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr;
    gap: 2em;
    max-width: 1200px;
    margin: 0 auto;
    padding: 7em 1.5em 4em;
    color: var(--color-ink-900);
  }

  @media (min-width: 900px) {
    .guide-container {
      grid-template-columns: 220px 1fr;
      gap: 3em;
    }
  }

  .guide-content { flex: 1; min-width: 0; }

  .guide-content h1 {
    font-size: 2.6em;
    color: var(--color-ink-900);
    margin: 0 0 1em;
    text-align: left;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-shadow: none;
  }

  /* Section styles — global because sections live in child components */
  :global(.guide-section) {
    margin-bottom: 2em;
    padding: 1.6em 1.8em;
    background: var(--color-parchment-100);
    border: 1px solid var(--color-ink-900);
    border-radius: 0;
    box-shadow: 0 0.4em 1.5em rgba(0, 0, 0, 0.08);
    text-shadow: none;
    color: var(--color-ink-900);
  }

  :global(.guide-section h2) {
    font-size: 1.6em;
    color: var(--color-ink-900);
    margin: 0 0 0.7em;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  :global(.guide-section h3) {
    font-size: 1.15em;
    color: var(--color-wax-red);
    margin: 1.4em 0 0.6em;
    font-family: var(--font-display);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  :global(.guide-section h4) {
    font-size: 1em;
    color: var(--color-ink-700);
    margin: 1em 0 0.5em;
    font-family: var(--font-display);
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  :global(.guide-section p) {
    margin: 0 0 1em;
    line-height: 1.55;
    font-family: var(--font-body);
    color: var(--color-ink-900);
  }

  :global(.guide-section ul) {
    list-style-position: outside;
    padding-left: 1.2em;
    margin: 0.8em 0;
  }

  :global(.guide-section li) {
    margin-bottom: 0.4em;
    line-height: 1.55;
    color: var(--color-ink-700);
  }

  :global(.guide-section strong) {
    color: rgba(0, 0, 0, 0.85);
    font-weight: 600;
  }

  :global(.strategy-list),
  :global(.controls-list) {
    padding-left: 0;
    list-style-type: none;
  }

  /* FAQ */
  :global(.faq-item) {
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5em;
    padding: 1em;
    margin-bottom: 1em;
    transition: background-color 0.2s ease;
  }

  :global(.faq-item:hover) {
    background-color: rgba(255, 255, 255, 0.8);
  }

  :global(.faq-item h3) {
    color: rgba(0, 0, 0, 0.85);
    margin-top: 0;
    font-size: 1.2em;
  }

  :global(.faq-item p) {
    margin: 0.5em 0 0;
  }

  /* Race section */
  :global(.race-icon-guide) {
    width: 2.5em;
    height: 2.5em;
    opacity: 0.9;
    fill: rgba(0, 0, 0, 0.7);
  }

  :global(.race-icon-guide.human-icon) { fill: #8B4513; }
  :global(.race-icon-guide.elf-icon) { fill: #228B22; }
  :global(.race-icon-guide.dwarf-icon) { fill: #696969; }
  :global(.race-icon-guide.goblin-icon) { fill: #6B8E23; }
  :global(.race-icon-guide.fairy-icon) { fill: #9370DB; }

  :global(.race-grid) {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5em;
    margin: 2em 0;
  }

  :global(.race-card) {
    background-color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5em;
    padding: 1.2em;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  :global(.race-card:hover) {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }

  :global(.race-header) {
    display: flex;
    align-items: center;
    margin-bottom: 0.8em;
  }

  :global(.race-icon) {
    margin-right: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.race-card h3) {
    margin: 0;
    color: rgba(0, 0, 0, 0.8);
    font-weight: 600;
  }

  :global(.race-desc) {
    margin: 0.5em 0 1em;
    line-height: 1.4;
  }

  :global(.race-traits) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    margin-bottom: 1em;
  }

  :global(.race-trait) {
    background: rgba(66, 133, 244, 0.1);
    color: rgba(66, 133, 244, 0.9);
    padding: 0.3em 0.8em;
    border-radius: 1em;
    font-size: 0.9em;
    border: 1px solid rgba(66, 133, 244, 0.3);
  }

  :global(.race-tip) {
    font-size: 0.95em;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    padding-top: 0.8em;
    margin: 0;
  }

  /* Rarity tags */
  :global(.rarity-list) {
    list-style-type: none;
    padding-left: 0;
  }

  :global(.rarity-list li) {
    margin-bottom: 0.5em;
    display: flex;
    align-items: center;
  }

  :global(.rarity-tag) {
    display: inline-block;
    padding: 0.2em 0.5em;
    border-radius: 0.3em;
    margin-right: 0.8em;
    font-weight: bold;
    font-size: 0.9em;
  }

  :global(.common) {
    background-color: rgba(158, 158, 158, 0.2);
    color: #616161;
    border: 1px solid rgba(158, 158, 158, 0.4);
  }

  :global(.uncommon) {
    background-color: rgba(76, 175, 80, 0.2);
    color: #2e7d32;
    border: 1px solid rgba(76, 175, 80, 0.4);
  }

  :global(.rare) {
    background-color: rgba(33, 150, 243, 0.2);
    color: #0277bd;
    border: 1px solid rgba(33, 150, 243, 0.4);
  }

  :global(.epic) {
    background-color: rgba(156, 39, 176, 0.2);
    color: #7b1fa2;
    border: 1px solid rgba(156, 39, 176, 0.4);
  }

  :global(.legendary) {
    background-color: rgba(255, 152, 0, 0.2);
    color: #ef6c00;
    border: 1px solid rgba(255, 152, 0, 0.4);
  }

  :global(.mythic) {
    background-color: rgba(233, 30, 99, 0.2);
    color: #c2185b;
    border: 1px solid rgba(233, 30, 99, 0.4);
  }

  /* Tip & info boxes */
  :global(.tip-box) {
    background: rgba(66, 133, 244, 0.05);
    border-left: 3px solid rgba(66, 133, 244, 0.5);
    padding: 1em 1.5em;
    margin: 1.5em 0;
    border-radius: 0 0.3em 0.3em 0;
  }

  :global(.tip-box h4) {
    color: rgba(66, 133, 244, 0.9);
    margin-top: 0;
    margin-bottom: 0.5em;
  }

  :global(.tip-box p) {
    margin: 0;
    color: rgba(0, 0, 0, 0.8);
  }

  :global(.scenario-box) {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.4em;
    padding: 1em 1.2em;
    margin: 1em 0;
  }

  :global(.scenario-box h4) {
    margin-top: 0;
  }

  /* Responsive */
  @media (min-width: 768px) {
    :global(.race-grid) {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (min-width: 1200px) {
    :global(.race-grid) {
      grid-template-columns: 1fr 1fr 1fr;
    }
  }
</style>
