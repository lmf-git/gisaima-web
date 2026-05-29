<script>
  import UNITS from "gisaima-shared/definitions/UNITS.js";
  import Unit from "../icons/Unit.svelte";

  function getUnitCategory(unit) {
    const typeMap = {
      'warrior': 'Military Unit',
      'scout': 'Scout Unit',
      'archer': 'Ranged Unit',
      'knight': 'Elite Unit',
      'defender': 'Defensive Unit',
      'raider': 'Fast Attack Unit',
      'enchanter': 'Magic Unit',
      'support': 'Support Unit',
      'elite': 'Elite Unit',
      'siege': 'Siege Unit',
      'worker': 'Worker Unit',
      'gatherer': 'Gathering Unit'
    };
    return typeMap[unit.type] || "Military Unit";
  }

  const unitExamples = Object.entries(UNITS)
    .filter(([_, u]) => u.category === 'player' && u.type !== 'player')
    .sort((a, b) => {
      const levelDiff = (a[1].requirements?.structureLevel || 0) - (b[1].requirements?.structureLevel || 0);
      const aTotAtk = (a[1].meleeAttack||0) + (a[1].rangedAttack||0) + (a[1].magicAttack||0);
      const bTotAtk = (b[1].meleeAttack||0) + (b[1].rangedAttack||0) + (b[1].magicAttack||0);
      return levelDiff !== 0 ? levelDiff : aTotAtk - bTotAtk;
    })
    .slice(0, 3)
    .map(([id, u]) => ({
      id,
      name: u.name,
      description: u.description || `A ${u.type} unit`,
      subtitle: getUnitCategory(u),
      meleeAttack: u.meleeAttack || 0,
      rangedAttack: u.rangedAttack || 0,
      magicAttack: u.magicAttack || 0,
      time: u.timePerUnit,
      cost: u.cost || {},
      requirements: u.requirements || {},
      tooltip: u.recruitment?.tooltip || "",
      race: u.race
    }));
</script>

<section id="units-groups" class="guide-section">
  <h2>Units & Groups</h2>
  <p>
    Units are the mobile forces that allow you to expand territory, engage in combat, and gather resources.
    Units are organized into groups for easier management.
  </p>

  <div class="info-box">
    <h4>Unit Types Overview</h4>
    <p>Units vary in abilities, cost, and power. Here are some examples:</p>
    <div class="element-grid unit-grid">
      {#each unitExamples as unit}
        <div class="element-card unit-card {unit.requirements && Object.keys(unit.requirements).length > 0 ? 'elite' : ''}">
          <div class="element-header">
            <div class="element-icon"><Unit unitIconKey={unit.id} extraClass="guide-element-icon" /></div>
            <div class="element-title">
              <h5>{unit.race ? `${unit.race.charAt(0).toUpperCase() + unit.race.slice(1)} ` : ''}{unit.name}</h5>
              <div class="element-subtitle">{unit.subtitle}</div>
            </div>
          </div>
          <div class="element-body">
            <p class="element-desc">{unit.description}</p>
            <div class="attributes-grid">
              {#if unit.meleeAttack > 0}
                <div class="attribute">
                  <span class="attribute-label">Melee</span>
                  <span class="attribute-value battle-stat melee">{unit.meleeAttack.toFixed(1)}</span>
                </div>
              {/if}
              {#if unit.rangedAttack > 0}
                <div class="attribute">
                  <span class="attribute-label">Ranged</span>
                  <span class="attribute-value battle-stat ranged">{unit.rangedAttack.toFixed(1)}</span>
                </div>
              {/if}
              {#if unit.magicAttack > 0}
                <div class="attribute">
                  <span class="attribute-label">Magic</span>
                  <span class="attribute-value battle-stat magic">{unit.magicAttack.toFixed(1)}</span>
                </div>
              {/if}
              <div class="attribute">
                <span class="attribute-label">Time</span>
                <span class="attribute-value">{unit.time} ticks</span>
              </div>
            </div>
            {#if Object.keys(unit.cost).length > 0}
              <div class="resources-list">
                {#each Object.entries(unit.cost) as [resourceId, amount]}
                  <div class="resource-item">
                    <span class="resource-name">{resourceId}</span>
                    <span class="resource-amount">{amount}</span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if unit.requirements && Object.keys(unit.requirements).length > 0}
              <div class="requirements-list">
                {#if unit.requirements.structureLevel}
                  <div class="requirement-item">
                    <span class="requirement-label">Structure Level</span>
                    <span class="requirement-value">{unit.requirements.structureLevel}</span>
                  </div>
                {/if}
                {#if unit.requirements.race}
                  <div class="requirement-item">
                    <span class="requirement-label">Race</span>
                    <span class="requirement-value">{unit.requirements.race.charAt(0).toUpperCase() + unit.requirements.race.slice(1)}</span>
                  </div>
                {/if}
                {#if unit.requirements.buildingType}
                  <div class="requirement-item">
                    <span class="requirement-label">Building</span>
                    <span class="requirement-value">
                      {unit.requirements.buildingType.charAt(0).toUpperCase() + unit.requirements.buildingType.slice(1)}
                      {unit.requirements.buildingLevel ? `(Lvl ${unit.requirements.buildingLevel})` : ''}
                    </span>
                  </div>
                {/if}
              </div>
            {/if}
            {#if unit.tooltip}
              <div class="unit-tooltip">
                <span class="tooltip-text">{unit.tooltip}</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .element-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4em;
    height: 2.4em;
    flex-shrink: 0;
    color: inherit;
  }
</style>
