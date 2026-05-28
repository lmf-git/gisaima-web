<script>
  import BattleSimulator from "../BattleSimulator.svelte";
</script>

<section id="battles" class="guide-section">
  <h2>Battles & Combat</h2>
  <p>
    Combat in Gisaima is strategic and consequential, with multiple ways to engage enemies.
  </p>

  <BattleSimulator />

  <h3>Attacking Units</h3>
  <p>
    When encountering enemy unit groups, you have several combat options:
  </p>
  <ul>
    <li>Direct attacks against enemy unit groups</li>
    <li>Joining ongoing battles to support allies</li>
    <li>Setting retreat conditions based on percentage of losses</li>
    <li>Fleeing from battles after the next tick is processed</li>
  </ul>
  <p>
    Combat factors include unit sizes, types, and environmental conditions. Smaller groups may
    flee from larger forces, while sufficiently large groups may be forced into battle.
  </p>

  <h3>Attacking Structures</h3>
  <ul>
    <li>Destroy enemy structures through direct attacks</li>
    <li>Capture structures after defeating defenders</li>
    <li>Siege structures to weaken them over time</li>
    <li>Structures under siege for 15 game days may be destroyed</li>
    <li>Continuous trebuchet attacks for 3 days can turn structures to ruins</li>
    <li>Structure durability decreases as they take damage in combat</li>
  </ul>

  <h3>Battle Outcomes</h3>
  <ul>
    <li><strong>Automatic Looting:</strong> All items carried by defeated groups are automatically collected</li>
    <li><strong>Loot Distribution:</strong> If multiple groups are on the winning side, items are randomly distributed among them</li>
    <li><strong>Loot Notification:</strong> Groups receive messages indicating how many items they looted from battle</li>
    <li><strong>Scavenging:</strong> Beyond automatic looting, additional equipment may be salvageable from the battlefield</li>
    <li><strong>Capture:</strong> Take defeated enemies prisoner</li>
    <li><strong>Ransom:</strong> Negotiate the release of captives for payment</li>
  </ul>
  <p>
    A player's morality affects these options - low morality players may have their units turned against them,
    while good morality players' units must be captured or ransomed.
  </p>

  <div class="tip-box">
    <h4>Strategic Tip: Item Management</h4>
    <p>
      Consider what items your groups carry into battle. Valuable items might be lost if your group is defeated,
      so leave precious cargo behind when heading into dangerous situations. Conversely, be aware that defeating
      enemy groups with valuable items can be quite profitable!
    </p>
  </div>

  <h3>Battle Duration & Resolution</h3>
  <p>
    Battles in Gisaima don't resolve instantly — they take time to play out, with larger battles
    taking longer to resolve than smaller ones:
  </p>
  <div class="info-box">
    <h4>How Battle Duration Works:</h4>
    <ul>
      <li><strong>Small battles</strong> (5 or fewer units) typically resolve in 1-3 ticks</li>
      <li><strong>Medium battles</strong> (6-20 units) may take 2-5 ticks to complete</li>
      <li><strong>Large battles</strong> (21-50 units) often extend to 4-8 ticks</li>
      <li><strong>Massive battles</strong> (50+ units) can last 6-12+ ticks or more</li>
    </ul>
    <p class="note">Note: Each tick is approximately 1-2 minutes of real time, depending on world speed settings.</p>
  </div>

  <h3>Battle Casualties</h3>
  <p>
    When a battle concludes, casualties are calculated based on the relative power of each side.
    Battles that are evenly matched generally result in higher casualty rates for both sides.
  </p>
  <div class="info-box">
    <h4>Notable Battle Mechanics:</h4>
    <ul>
      <li><strong>Player Protection:</strong> Player units have special protection in battles against non-player units:
        <ul>
          <li>Non-player units are lost first in battle</li>
          <li>Players only face risk of death when casualties exceed 80%</li>
          <li>Even when defeated, players have a chance to escape as "Battle Survivors"</li>
        </ul>
      </li>
      <li><strong>One-sided Victories:</strong> When one side greatly outnumbers the other, the stronger side suffers fewer casualties:
        <ul>
          <li>Overwhelming advantage (5:1 ratio): 1-5% casualties for winner</li>
          <li>Strong advantage (3:1 ratio): 3-10% casualties for winner</li>
          <li>Moderate advantage (1.5:1 ratio): 5-15% casualties for winner</li>
          <li>Close match: 10-25% casualties for winner</li>
        </ul>
      </li>
      <li><strong>Player vs. Player:</strong> In battles exclusively between players, special protection rules do not apply — these battles are always to the death.</li>
      <li><strong>Joining Battles:</strong> Groups can join ongoing battles on either side, potentially turning the tide of combat.</li>
      <li><strong>Fleeing:</strong> Groups can attempt to flee battles, processed after the next tick. Successful fleeing removes the group from combat.</li>
    </ul>
  </div>

  <h3>Example Scenarios</h3>
  <div class="scenario-box">
    <h4>Small Skirmish</h4>
    <p><strong>Forces:</strong> 3 player units vs. 2 NPC units</p>
    <p><strong>Duration:</strong> Likely 1-2 ticks</p>
    <p><strong>Outcome:</strong> If player side wins, expects 5-15% casualties. Players would survive unless it's a close battle.</p>
  </div>
  <div class="scenario-box">
    <h4>Medium Battle</h4>
    <p><strong>Forces:</strong> 8 player units (including 2 players) vs. 10 NPC units</p>
    <p><strong>Duration:</strong> Likely 3-4 ticks</p>
    <p><strong>Outcome:</strong> Casualties would be higher (10-25%), with non-player units lost first. If defeated, players have a 20% chance to escape as a new "Battle Survivors" group.</p>
  </div>
  <div class="scenario-box">
    <h4>Large-scale Conflict</h4>
    <p><strong>Forces:</strong> 30 player units vs. 25 NPC units</p>
    <p><strong>Duration:</strong> Likely 5-7 ticks</p>
    <p><strong>Outcome:</strong> Battle would progress slowly with multiple ticks, giving players time to potentially bring reinforcements.</p>
  </div>
</section>
