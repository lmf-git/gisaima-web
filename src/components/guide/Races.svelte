<script>
  import Elf from '../icons/Elf.svelte';
  import Dwarf from '../icons/Dwarf.svelte';
  import Goblin from '../icons/Goblin.svelte';
  import Fairy from '../icons/Fairy.svelte';
  import Human from '../icons/Human.svelte';
</script>

<section id="races" class="guide-section">
  <h2>Races</h2>
  <p>
    When joining a world in Gisaima, you'll choose one of five distinct races.
    Each race has unique traits and advantages that influence your gameplay strategy.
  </p>

  <div class="race-grid">
    <div class="race-card">
      <div class="race-header">
        <div class="race-icon"><Human size="2.5em" extraClass="race-icon-guide human-icon" /></div>
        <h3>Humans</h3>
      </div>
      <p class="race-desc">Versatile and adaptable, humans excel at diplomacy and trade.</p>
      <div class="race-traits">
        <span class="race-trait">Diplomatic</span>
        <span class="race-trait">Fast Learners</span>
        <span class="race-trait">Resource Efficient</span>
      </div>
      <p class="race-tip">
        <strong>Best For:</strong> New players and those who prefer balanced gameplay with
        flexibility to adapt to different situations.
      </p>
    </div>

    <div class="race-card">
      <div class="race-header">
        <div class="race-icon"><Elf size="2.5em" extraClass="race-icon-guide elf-icon" /></div>
        <h3>Elves</h3>
      </div>
      <p class="race-desc">Ancient forest dwellers with deep connections to nature and magic.</p>
      <div class="race-traits">
        <span class="race-trait">Magical Affinity</span>
        <span class="race-trait">Forest Advantage</span>
        <span class="race-trait">Long-range Combat</span>
      </div>
      <p class="race-tip">
        <strong>Best For:</strong> Players who prefer ranged combat and excel in
        forest environments with magical advantage.
      </p>
    </div>

    <div class="race-card">
      <div class="race-header">
        <div class="race-icon"><Dwarf size="2.5em" extraClass="race-icon-guide dwarf-icon" /></div>
        <h3>Dwarves</h3>
      </div>
      <p class="race-desc">Sturdy mountain folk, master craftsmen and miners.</p>
      <div class="race-traits">
        <span class="race-trait">Mining Bonus</span>
        <span class="race-trait">Strong Defense</span>
        <span class="race-trait">Mountain Advantage</span>
      </div>
      <p class="race-tip">
        <strong>Best For:</strong> Players focused on resource gathering and
        defensive strategies in mountainous regions.
      </p>
    </div>

    <div class="race-card">
      <div class="race-header">
        <div class="race-icon"><Goblin size="2.5em" extraClass="race-icon-guide goblin-icon" /></div>
        <h3>Goblins</h3>
      </div>
      <p class="race-desc">Cunning and numerous, goblins thrive in harsh environments.</p>
      <div class="race-traits">
        <span class="race-trait">Fast Production</span>
        <span class="race-trait">Night Advantage</span>
        <span class="race-trait">Scavenging Bonus</span>
      </div>
      <p class="race-tip">
        <strong>Best For:</strong> Players who enjoy aggressive expansion and
        quick production with night operations.
      </p>
    </div>

    <div class="race-card">
      <div class="race-header">
        <div class="race-icon"><Fairy size="2.5em" extraClass="race-icon-guide fairy-icon" /></div>
        <h3>Fairies</h3>
      </div>
      <p class="race-desc">Magical beings with flight capabilities and illusion powers.</p>
      <div class="race-traits">
        <span class="race-trait">Flight</span>
        <span class="race-trait">Illusion Magic</span>
        <span class="race-trait">Small Size Advantage</span>
      </div>
      <p class="race-tip">
        <strong>Best For:</strong> Players who prefer stealth, mobility, and
        deception over direct confrontation.
      </p>
    </div>
  </div>

  <p>
    Once you've chosen a race, you'll start at your race's specific spawn point in the world.
    Each race's spawn is located in a biome that complements their natural advantages.
  </p>
</section>
