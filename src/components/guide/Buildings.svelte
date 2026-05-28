<script>
  import { BUILDINGS } from "gisaima-shared/definitions/BUILDINGS.js";

  function getBuildingCategory(type) {
    const categories = {
      'smithy': 'Production Building',
      'barracks': 'Military Building',
      'mine': 'Resource Building',
      'wall': 'Defensive Building',
      'academy': 'Research Building',
      'market': 'Economy Building',
      'farm': 'Resource Building'
    };
    return categories[type] || "Utility Building";
  }

  const buildingExamples = Object.entries(BUILDINGS.types)
    .filter(([_, b]) => !b.monster)
    .slice(0, 3)
    .map(([id, b]) => ({
      id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      subtitle: getBuildingCategory(id),
      resources: b.baseRequirements || [],
      benefits: {
        level2: BUILDINGS.benefits[id]?.[2] || [],
        level3: BUILDINGS.benefits[id]?.[3] || []
      }
    }));
</script>

<section id="buildings" class="guide-section">
  <h2>Buildings</h2>
  <p>
    Buildings are specialized structures that provide specific bonuses and capabilities within your settlements.
    They can be constructed, upgraded, and managed to enhance your strategic operations.
  </p>

  <div class="info-box">
    <h4>Building Types Overview</h4>
    <p>Buildings can be constructed within your structures to provide specialized capabilities:</p>
    <div class="element-grid building-grid">
      {#each buildingExamples as building}
        <div class="element-card">
          <div class="element-header">
            <div class="element-icon">{building.icon}</div>
            <div class="element-title">
              <h5>{building.name}</h5>
              <div class="element-subtitle">{building.subtitle}</div>
            </div>
          </div>
          <div class="element-body">
            <p class="element-desc">{building.description}</p>
            {#if building.resources.length > 0}
              <div class="resources-list">
                {#each building.resources as resource}
                  <div class="resource-item">
                    <span class="resource-name">{resource.name}</span>
                    <span class="resource-amount">{resource.quantity}</span>
                  </div>
                {/each}
              </div>
            {/if}
            {#if building.benefits.level2.length > 0 || building.benefits.level3.length > 0}
              <div class="building-benefits">
                <h6>Upgrade Benefits</h6>
                {#each building.benefits.level2 as benefit}
                  <div class="benefit-item">
                    <div class="benefit-level">Level 2</div>
                    <div class="benefit-desc">{benefit.name}: {benefit.description}</div>
                  </div>
                {/each}
                {#each building.benefits.level3 as benefit}
                  <div class="benefit-item">
                    <div class="benefit-level">Level 3</div>
                    <div class="benefit-desc">{benefit.name}: {benefit.description}</div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <h3>Building Upgrades & Management</h3>
  <ul>
    <li>Each upgrade level requires specific resources and time</li>
    <li>Higher levels unlock new crafting recipes, unit types, or bonuses</li>
    <li>Building synergies can provide additional benefits when certain buildings are paired together</li>
    <li>Some buildings have race-specific variations with unique bonuses</li>
  </ul>
</section>
