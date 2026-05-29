<script>
  import { STRUCTURES } from "gisaima-shared/definitions/STRUCTURES.js";
  import StructureIcon from "../icons/StructureIcon.svelte";

  function getStructureCategory(type) {
    const categories = {
      'watchtower': 'Defensive Structure',
      'storage': 'Utility Structure',
      'workshop': 'Production Structure',
      'outpost': 'Expansion Structure',
      'basic_shelter': 'Basic Structure',
      'fortress': 'Military Structure'
    };
    return categories[type] || 'Building';
  }

  const structureExamples = Object.entries(STRUCTURES)
    .filter(([_, s]) => !s.monster)
    .slice(0, 3)
    .map(([id, s]) => ({
      id,
      name: s.name,
      description: s.description,
      type: s.type,
      subtitle: getStructureCategory(s.type),
      durability: s.durability,
      capacity: s.capacity,
      sightRange: s.sightRange,
      resources: s.requiredResources || [],
      features: s.features || []
    }));
</script>

<section id="structures" class="guide-section">
  <h2>Structures</h2>
  <p>
    Structures form the backbone of your territorial presence, providing resources, defensive capabilities,
    and other strategic advantages.
  </p>

  <div class="info-box">
    <h4>Structure Types Overview</h4>
    <p>Structures vary in purpose, cost, and strategic value. Here are some examples:</p>
    <div class="element-grid structure-grid">
      {#each structureExamples as structure}
        <div class="element-card">
          <div class="element-header">
            <div class="element-icon"><StructureIcon type={structure.type} size="1.6em" /></div>
            <div class="element-title">
              <h5>{structure.name}</h5>
              <div class="element-subtitle">{structure.subtitle}</div>
            </div>
          </div>
          <div class="element-body">
            <p class="element-desc">{structure.description}</p>
            <div class="attributes-grid">
              {#if structure.durability}
                <div class="attribute">
                  <span class="attribute-label">Durability</span>
                  <span class="attribute-value">{structure.durability}</span>
                </div>
              {/if}
              {#if structure.sightRange}
                <div class="attribute">
                  <span class="attribute-label">Sight Range</span>
                  <span class="attribute-value">{structure.sightRange}</span>
                </div>
              {/if}
              {#if structure.capacity}
                <div class="attribute">
                  <span class="attribute-label">Capacity</span>
                  <span class="attribute-value">{structure.capacity}</span>
                </div>
              {/if}
            </div>
            {#if structure.resources.length > 0}
              <div class="resources-list">
                {#each structure.resources as resource}
                  <div class="resource-item">
                    <span class="resource-name">{resource.id}</span>
                    <span class="resource-amount">{resource.quantity}</span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if structure.features.length > 0}
              <div class="features-list">
                {#each structure.features as feature}
                  <div class="feature">
                    <span class="feature-icon">{feature.icon || '✨'}</span>
                    <span class="feature-text">{feature.name}: {feature.description}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <h3>Building & Upgrading Structures</h3>
  <p>
    Structures are built and improved through a tick-based progression system:
  </p>
  <ul>
    <li><strong>Building:</strong> Construction requires specific resources and takes several ticks to complete</li>
    <li><strong>Upgrading:</strong> Existing structures can be upgraded using shared resources</li>
    <li><strong>Durability:</strong> Structures have health points that decrease when damaged in battle</li>
    <li><strong>Battle Indicators:</strong> Structures under attack display their current health percentage</li>
    <li><strong>Race Restrictions:</strong> Some structures have race-specific interactions and limitations</li>
    <li><strong>Ownership:</strong> Building actions are restricted to buildings you own or your race controls</li>
  </ul>

  <h3>Buildings</h3>
  <p>
    Within settlements, various buildings can be constructed to provide specific benefits:
  </p>
  <ul>
    <li><strong>Banks:</strong> Store wealth and offer financial services including loans and interest</li>
    <li><strong>Warehouses:</strong> Increase storage capacity for resources and items</li>
    <li><strong>Barracks:</strong> Improve military unit training and recruitment</li>
    <li><strong>Smithy:</strong> Enable metal crafting and equipment production</li>
    <li><strong>Workshop:</strong> Support general crafting activities</li>
    <li><strong>Harbor:</strong> Provide naval construction and trade capabilities</li>
    <li><strong>Stables:</strong> Support mounted units and animal husbandry</li>
  </ul>

  <h3>Structure Capacity</h3>
  <ul>
    <li>Capacity can be increased through upgrades</li>
    <li>Capacity limits apply to all units regardless of owner</li>
    <li>Strategic planning is required to maximize limited space</li>
    <li>Structure levels affect available crafting recipes and activities</li>
  </ul>

  <h3>Recruitment</h3>
  <ul>
    <li>Recruitment requires resources based on unit type</li>
    <li>Units are restricted to your character's race</li>
    <li>Higher-level structures allow for more advanced unit types</li>
    <li>Recruitment takes place over one or more ticks depending on unit complexity</li>
  </ul>

  <h3>Structure Storage Systems</h3>
  <ul>
    <li><strong>Shared Storage:</strong> Resources accessible to all users of the structure</li>
    <li><strong>Bank Storage:</strong> Private items accessible only to the owner</li>
    <li><strong>Building Materials:</strong> Resources dedicated to structure improvements</li>
  </ul>
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
