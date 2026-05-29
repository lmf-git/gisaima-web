<script>
  import { onMount, onDestroy } from 'svelte';
  import UNITS from 'gisaima-shared/definitions/UNITS.js';
  import { ITEMS } from 'gisaima-shared/definitions/ITEMS.js';
  import {
    calculateGroupPower,
    calculateGroupCombatStats,
    calculateDefenseMultiplier,
    calculatePowerRatios,
    calculateAttrition,
    processPvPCombat,
    selectUnitsForCasualties
  } from 'gisaima-shared/war/battles.js';

  import Unit from './icons/Unit.svelte';

  // Battle configuration
  let side1 = {
    name: 'Attackers',
    groups: {},
    casualties: 0,
    power: 0
  };

  let side2 = {
    name: 'Defenders',
    groups: {},
    casualties: 0,
    power: 0
  };

  // Create a simple Group class for the UI
  class Group {
    constructor(id, name, side) {
      this.id = id;
      this.name = name;
      this.units = {};
      this.items = {}; // {item_code: quantity}
      this.side = side;
      this.power = 0;
    }

    addUnit(type, level = 1, isPlayer = false) {
      const unitId = `unit_${Object.keys(this.units).length + 1}`;
      const unitType = type || 'human_warrior';
      let unitData = {
        id: unitId,
        type: unitType,
        level: level
      };

      if (isPlayer) {
        unitData.type = 'player';
        unitData.displayName = `Player ${Object.keys(this.units).length + 1}`;
      }

      this.units[unitId] = unitData;
      return unitId;
    }

    addItem(itemId, quantity = 1) {
      const upperItemId = itemId.toUpperCase();
      this.items[upperItemId] = (this.items[upperItemId] || 0) + quantity;
    }

    calculatePower() {
      this.power = calculateGroupPower(this);
      return this.power;
    }
  }

  // Simulation state
  let simulationResults = null;
  let maxTicks = 20; // Safety limit; battleTick resolves long stalemates around tick 10
  let showingDetailedResults = false;
  let loading = false;
  let availableUnitTypes = [];
  let availableItems = [];

  // Step-by-step battle simulation variables
  let stepMode = false;
  let currentTick = 0;
  let currentStepState = null;

  // Working copies of the two sides as the battle progresses
  let working = null;
  let totalCasualties = { side1: 0, side2: 0 };
  let totalCriticalHits = { side1: [], side2: [] };

  // Auto-step variables
  let autoStepMode = false;
  let autoStepInterval = 2500;
  let autoStepTimer = null;

  // UI state
  let selectedSide = 'side1';
  let selectedGroupId = null;
  let newGroupName = '';
  let selectedUnitType = '';
  let selectedItemId = '';
  let itemQuantity = 1;
  let unitLevel = 1;
  let battleLog = [];

  onMount(() => {
    // Get unit types from UNITS (player-recruitable units, excluding the player character)
    availableUnitTypes = Object.entries(UNITS)
      .filter(([_, unit]) => unit.category === 'player' && unit.type !== 'player')
      .map(([id, unit]) => ({ id, name: unit.name, type: unit.type }));

    availableUnitTypes.sort((a, b) => a.name.localeCompare(b.name));

    // Add the player character at the top
    availableUnitTypes.unshift({ id: 'player', name: 'Player Character', type: 'player' });

    if (availableUnitTypes.length > 0) {
      selectedUnitType = availableUnitTypes[0].id;
    }

    // Get item list (anything that contributes power)
    availableItems = Object.entries(ITEMS)
      .filter(([_, item]) => item.power && item.power > 0)
      .map(([id, item]) => ({
        id,
        name: item.name,
        type: item.type,
        power: item.power || 0,
        rarity: item.rarity || 'common'
      }));

    availableItems.sort((a, b) => b.power - a.power);

    if (availableItems.length > 0) {
      selectedItemId = availableItems[0].id;
    }

    // Create initial groups
    addGroup('side1');
    addGroup('side2');
  });

  onDestroy(() => {
    if (autoStepTimer) clearInterval(autoStepTimer);
  });

  // ---------- Configuration helpers ----------
  function addGroup(sideId) {
    const side = sideId === 'side1' ? side1 : side2;
    const newGroupId = `group_${sideId}_${Object.keys(side.groups).length + 1}`;
    const groupName = newGroupName || `${side.name} Group ${Object.keys(side.groups).length + 1}`;

    side.groups[newGroupId] = new Group(newGroupId, groupName, sideId === 'side1' ? 1 : 2);

    selectedSide = sideId;
    selectedGroupId = newGroupId;
    newGroupName = '';

    calculateSidePowers();
  }

  function getSelectedGroup() {
    if (!selectedGroupId) return null;
    const side = selectedSide === 'side1' ? side1 : side2;
    return side.groups[selectedGroupId];
  }

  function addUnitToGroup() {
    const group = getSelectedGroup();
    if (!group) return;

    const isPlayerUnit = selectedUnitType === 'player';
    group.addUnit(selectedUnitType, unitLevel, isPlayerUnit);

    calculateSidePowers();
    unitLevel = 1;
  }

  function addItemToGroup() {
    const group = getSelectedGroup();
    if (!group) return;

    group.addItem(selectedItemId, itemQuantity);
    calculateSidePowers();
    itemQuantity = 1;
  }

  function deleteGroup(sideId, groupId) {
    const side = sideId === 'side1' ? side1 : side2;
    if (side.groups[groupId]) {
      delete side.groups[groupId];
      if (selectedGroupId === groupId) selectedGroupId = null;
      calculateSidePowers();
    }
  }

  function calculateSidePowers() {
    side1.power = 0;
    Object.values(side1.groups).forEach(group => {
      side1.power += group.calculatePower();
    });

    side2.power = 0;
    Object.values(side2.groups).forEach(group => {
      side2.power += group.calculatePower();
    });

    // Trigger Svelte reactivity after mutating nested state
    side1 = side1;
    side2 = side2;
  }

  function getUnitName(unitType) {
    if (unitType === 'player') return 'Player Character';
    for (const [id, unit] of Object.entries(UNITS)) {
      if (id === unitType || unit.type === unitType) return unit.name;
    }
    return unitType.charAt(0).toUpperCase() + unitType.slice(1);
  }

  function getItemName(itemId) {
    return ITEMS[itemId]?.name || itemId;
  }

  function getRarityClass(rarity) {
    return rarity || 'common';
  }

  // ---------- Shared-logic helpers (mirror battleTick) ----------
  function cloneSide(side) {
    // Plain deep clone; Group instances become plain objects, which the
    // shared battle functions accept ({ units, items } shape).
    return JSON.parse(JSON.stringify({ name: side.name, groups: side.groups }));
  }

  function countUnits(side) {
    let count = 0;
    for (const gid in side.groups) {
      count += Object.keys(side.groups[gid].units || {}).length;
    }
    return count;
  }

  // Aggregate typed combat stats across a side (same as battleTick PHASE 2)
  function aggregateCombatStats(side) {
    const totals = { meleeAtk: 0, rangedAtk: 0, magicAtk: 0, meleeDef: 0, rangedDef: 0, magicDef: 0, unitCount: 0 };
    for (const gid in side.groups) {
      const gs = calculateGroupCombatStats(side.groups[gid]);
      for (const k of Object.keys(totals)) totals[k] += gs[k] || 0;
    }
    return totals;
  }

  // Collect player critical hits from a side after processPvPCombat
  function collectCriticalHits(side) {
    const hits = [];
    for (const gid in side.groups) {
      const units = side.groups[gid].units || {};
      for (const uid in units) {
        const unit = units[uid];
        if (unit.type === 'player' && unit.criticalHit) {
          hits.push({
            name: unit.displayName || 'Player',
            combo: unit.comboCritical === true
          });
        }
      }
    }
    return hits;
  }

  function sideHasCriticalHit(side) {
    for (const gid in side.groups) {
      const units = side.groups[gid].units || {};
      for (const uid in units) {
        if (units[uid].type === 'player' && units[uid].criticalHit) return true;
      }
    }
    return false;
  }

  function logBattle(message, type = 'info') {
    battleLog = [...battleLog, { message, type }];
  }

  // ---------- Core tick: mirrors api/events/battleTick.js processBattle ----------
  function simulateTick(s1, s2, tickCount, priorCas1, priorCas2) {
    const side1State = cloneSide(s1);
    const side2State = cloneSide(s2);

    // --------- PHASE 1: CALCULATE INITIAL POWERS ---------
    const groupPowers = {};
    let side1Power = 0;
    let side2Power = 0;

    for (const gid in side1State.groups) {
      const power = calculateGroupPower(side1State.groups[gid]);
      groupPowers[gid] = power;
      side1Power += power;
    }
    for (const gid in side2State.groups) {
      const power = calculateGroupPower(side2State.groups[gid]);
      groupPowers[gid] = power;
      side2Power += power;
    }

    // Small random factor to avoid exact ties / eventual stalemates (battleTick parity)
    const randomFactor = 0.05;
    side1Power = side1Power * (1 + (Math.random() * randomFactor - randomFactor / 2));
    side2Power = side2Power * (1 + (Math.random() * randomFactor - randomFactor / 2));

    // --------- PHASE 2: CALCULATE ATTRITION ---------
    const { side1Ratio, side2Ratio } = calculatePowerRatios(side1Power, side2Power);
    logBattle(`Power ratios — ${s1.name}: ${(side1Ratio * 100).toFixed(1)}%, ${s2.name}: ${(side2Ratio * 100).toFixed(1)}%`);

    // PvP combat flags / critical hits (mutates unit objects in place)
    const { side1: pvp1, side2: pvp2 } = processPvPCombat(side1State, side2State, tickCount);
    side1State.groups = pvp1.groups;
    side2State.groups = pvp2.groups;

    const side1Crits = collectCriticalHits(side1State);
    const side2Crits = collectCriticalHits(side2State);
    side1Crits.forEach(c => logBattle(`Critical hit by ${c.name} (${s1.name})!`, 'critical'));
    side2Crits.forEach(c => logBattle(`Critical hit by ${c.name} (${s2.name})!`, 'critical'));

    // Typed defense multipliers — each side's defense resists the other's attacks
    const side1Stats = aggregateCombatStats(side1State);
    const side2Stats = aggregateCombatStats(side2State);
    const side1DefMultiplier = calculateDefenseMultiplier(side2Stats, side1Stats);
    const side2DefMultiplier = calculateDefenseMultiplier(side1Stats, side2Stats);

    let side1Attrition = calculateAttrition(side1Power, side1Ratio, side2Ratio, side1DefMultiplier);
    let side2Attrition = calculateAttrition(side2Power, side2Ratio, side1Ratio, side2DefMultiplier);

    // Stalemate luck factor (battleTick parity)
    if (side1Power > 0 && side2Power > 0 && side1Attrition === 0 && side2Attrition === 0) {
      const powerDifference = Math.abs(side1Power - side2Power) / (side1Power + side2Power);
      const strongerSide = side1Power > side2Power ? 1 : 2;
      const strongerSideChance = Math.min(0.8, 0.5 + powerDifference);
      const luckyStrongerSide = Math.random() < strongerSideChance;

      if ((strongerSide === 1 && luckyStrongerSide) || (strongerSide === 2 && !luckyStrongerSide)) {
        side2Attrition = Math.max(1, Math.floor(side2Power * 0.1 * (Math.random() + 0.5)));
      } else {
        side1Attrition = Math.max(1, Math.floor(side1Power * 0.1 * (Math.random() + 0.5)));
      }
      logBattle(`A stroke of luck changes the battle's course!`, 'important');
    }

    logBattle(`Attrition — ${s1.name}: ${side1Attrition}, ${s2.name}: ${side2Attrition}`);

    // --------- PHASE 3: APPLY CASUALTIES ---------
    const applyCasualties = (sideState, sidePower, sideAttrition, sideName) => {
      let newPower = 0;
      let casualties = 0;
      for (const gid in { ...sideState.groups }) {
        const group = sideState.groups[gid];
        const groupPower = groupPowers[gid] ?? calculateGroupPower(group);
        const groupShare = sidePower > 0 ? groupPower / sidePower : 1;
        const groupAttrition = Math.round(sideAttrition * groupShare);

        if (groupAttrition > 0) {
          const { unitsToRemove } = selectUnitsForCasualties(group.units, groupAttrition);
          unitsToRemove.forEach(uid => delete group.units[uid]);
          casualties += unitsToRemove.length;
          if (unitsToRemove.length > 0) {
            logBattle(`${sideName}, ${group.name}: ${unitsToRemove.length} unit(s) lost`);
          }
        }

        if (Object.keys(group.units).length <= 0) {
          delete sideState.groups[gid];
        } else {
          newPower += calculateGroupPower(group);
        }
      }
      return { newPower, casualties };
    };

    const r1 = applyCasualties(side1State, side1Power, side1Attrition, s1.name);
    const r2 = applyCasualties(side2State, side2Power, side2Attrition, s2.name);

    const newSide1Power = r1.newPower;
    const newSide2Power = r2.newPower;
    const cas1Total = priorCas1 + r1.casualties;
    const cas2Total = priorCas2 + r2.casualties;

    logBattle(`End of round ${tickCount} — ${s1.name}: ${newSide1Power.toFixed(1)} power, ${s2.name}: ${newSide2Power.toFixed(1)} power`);

    // --------- PHASE 4: DETERMINE WINNER (battleTick parity) ---------
    const side1Defeated = Object.keys(side1State.groups).length === 0;
    const side2Defeated = Object.keys(side2State.groups).length === 0;

    let winner; // undefined => battle continues
    if (side1Defeated && side2Defeated) {
      const s1Crit = sideHasCriticalHit(side1State) || side1Crits.length > 0;
      const s2Crit = sideHasCriticalHit(side2State) || side2Crits.length > 0;
      if (s1Crit && !s2Crit) winner = 1;
      else if (!s1Crit && s2Crit) winner = 2;
      else winner = 0;
    } else if (side1Defeated) {
      winner = 2;
    } else if (side2Defeated) {
      winner = 1;
    } else {
      const longBattle = tickCount >= 10;
      const minimalCasualties = cas1Total + cas2Total <= Math.floor(tickCount / 2);
      const powerRatioExtreme = side1Ratio > 0.8 || side2Ratio > 0.8;
      if (longBattle && minimalCasualties) {
        if (powerRatioExtreme) {
          winner = side1Ratio > 0.8 ? 1 : 2;
        } else {
          const resolution = Math.random();
          winner = resolution < 0.4 ? 0 : resolution < 0.7 ? 1 : 2;
        }
        logBattle(`The drawn-out battle is forced to a resolution.`, 'important');
      }
    }

    // Determine who is currently ahead for the in-progress status banner
    let winningState = 0;
    if (newSide1Power > newSide2Power * 1.1) winningState = 1;
    else if (newSide2Power > newSide1Power * 1.1) winningState = 2;

    return {
      side1: side1State,
      side2: side2State,
      powers: {
        side1Initial: side1Power,
        side2Initial: side2Power,
        side1Final: newSide1Power,
        side2Final: newSide2Power
      },
      casualties: {
        side1: r1.casualties,
        side2: r2.casualties,
        side1Total: cas1Total,
        side2Total: cas2Total
      },
      criticalHits: { side1: side1Crits, side2: side2Crits },
      defeated: { side1: side1Defeated, side2: side2Defeated },
      winningState,
      winner
    };
  }

  // ---------- Simulation control ----------
  function runBattleSimulation() {
    loading = true;
    battleLog = [];
    stepMode = true;
    currentTick = 0;
    currentStepState = null;
    totalCasualties = { side1: 0, side2: 0 };
    totalCriticalHits = { side1: [], side2: [] };

    working = { side1: cloneSide(side1), side2: cloneSide(side2) };

    simulationResults = {
      winner: null,
      side1: { initialPower: side1.power, finalPower: 0, casualties: 0 },
      side2: { initialPower: side2.power, finalPower: 0, casualties: 0 },
      tickCount: 0,
      criticalHits: { side1: [], side2: [] }
    };

    logBattle(`Battle started: ${side1.name} (${side1.power.toFixed(1)} power) vs ${side2.name} (${side2.power.toFixed(1)} power)`, 'important');

    processNextBattleTick();
    startAutoStep();

    loading = false;
  }

  function processNextBattleTick() {
    if (!stepMode) return;

    if (currentTick >= maxTicks) {
      logBattle('Maximum rounds reached — forcing conclusion', 'important');
      finalizeBattle(currentStepState, resolveByPower(currentStepState));
      return;
    }

    currentTick++;
    logBattle(`Round ${currentTick}: processing combat`);

    const result = simulateTick(
      working.side1,
      working.side2,
      currentTick,
      totalCasualties.side1,
      totalCasualties.side2
    );

    working.side1 = result.side1;
    working.side2 = result.side2;
    totalCasualties = { side1: result.casualties.side1Total, side2: result.casualties.side2Total };
    totalCriticalHits = {
      side1: [...totalCriticalHits.side1, ...result.criticalHits.side1],
      side2: [...totalCriticalHits.side2, ...result.criticalHits.side2]
    };

    currentStepState = result;

    if (result.winner !== undefined) {
      finalizeBattle(result, result.winner);
    } else if (currentTick >= maxTicks) {
      finalizeBattle(result, resolveByPower(result));
    }
  }

  function resolveByPower(state) {
    if (!state) return 0;
    if (state.powers.side1Final > state.powers.side2Final) return 1;
    if (state.powers.side2Final > state.powers.side1Final) return 2;
    return 0;
  }

  function finalizeBattle(finalState, winner) {
    simulationResults.winner = winner;
    simulationResults.side1.finalPower = finalState.powers.side1Final;
    simulationResults.side1.casualties = totalCasualties.side1;
    simulationResults.side2.finalPower = finalState.powers.side2Final;
    simulationResults.side2.casualties = totalCasualties.side2;
    simulationResults.tickCount = currentTick;
    simulationResults.criticalHits = totalCriticalHits;
    simulationResults = simulationResults;

    stepMode = false;
    stopAutoStep();

    if (winner === 1) {
      logBattle(`${side1.name} win the battle!`, 'important');
    } else if (winner === 2) {
      logBattle(`${side2.name} win the battle!`, 'important');
    } else {
      logBattle(`The battle ends in a draw!`, 'important');
    }
  }

  function stepForward() {
    if (stepMode) processNextBattleTick();
  }

  function fastForward() {
    stopAutoStep();
    while (stepMode && currentTick < maxTicks) {
      processNextBattleTick();
    }
  }

  function toggleDetailedResults() {
    showingDetailedResults = !showingDetailedResults;
  }

  function startAutoStep() {
    if (!autoStepMode && stepMode) {
      autoStepMode = true;
      if (autoStepTimer) clearInterval(autoStepTimer);
      autoStepTimer = setInterval(() => {
        stepForward();
        if (!stepMode) stopAutoStep();
      }, autoStepInterval);
    }
  }

  function stopAutoStep() {
    if (autoStepTimer) {
      clearInterval(autoStepTimer);
      autoStepTimer = null;
    }
    autoStepMode = false;
  }

  function toggleAutoStep() {
    if (autoStepMode) stopAutoStep();
    else startAutoStep();
  }

  function resetSimulation() {
    simulationResults = null;
    battleLog = [];
    stepMode = false;
    currentTick = 0;
    currentStepState = null;
    working = null;
    totalCasualties = { side1: 0, side2: 0 };
    totalCriticalHits = { side1: [], side2: [] };
    stopAutoStep();
  }

  // ---------- Status banner helpers ----------
  function getStepStatusText(state) {
    if (!state) return 'Both sides fight on!';
    if (state.winningState === 1) return `${side1.name} are gaining the upper hand!`;
    if (state.winningState === 2) return `${side2.name} are holding their ground!`;
    return 'Both sides fight on!';
  }

  function getStepStatusClass(state) {
    if (!state) return 'even-battle';
    if (state.winningState === 1) return 'side1-winning';
    if (state.winningState === 2) return 'side2-winning';
    return 'even-battle';
  }
</script>

<div class="battle-simulator">
  <h2>Battle Simulator</h2>
  <p class="simulator-intro">
    Test different battle configurations to see how the combat mechanics work. Add units and items to each side,
    then run the simulation to see the outcome. The simulator runs the same tick logic the live game uses.
  </p>

  {#if !simulationResults}
  <div class="simulator-config">
    <div class="simulator-sides">
      {#each [['side1', side1], ['side2', side2]] as [sideId, side]}
        <div class="side-config">
          <h3>{sideId === 'side1' ? 'Side 1' : 'Side 2'}: {side.name}</h3>
          <div class="side-power">Power: {side.power.toFixed(1)}</div>

          <div class="groups-container">
            {#each Object.entries(side.groups) as [groupId, group]}
              <div class="group-card" class:selected={selectedGroupId === groupId && selectedSide === sideId}>
                <div class="group-header">
                  <h4>{group.name}</h4>
                  <div class="group-power">Power: {group.power.toFixed(1)}</div>
                  <button class="select-btn" on:click={() => { selectedSide = sideId; selectedGroupId = groupId; }}>
                    Select
                  </button>
                  <button class="delete-btn" on:click={() => deleteGroup(sideId, groupId)}>
                    ✕
                  </button>
                </div>

                <div class="group-content">
                  <div class="unit-list">
                    <strong>Units: {Object.keys(group.units).length}</strong>
                    {#each Object.entries(group.units) as [unitId, unit]}
                      {@const uDef = UNITS[unit.type]}
                      <div class="unit-item">
                        <span class="unit-icon-wrap">
                          <Unit unitIconKey={unit.type} extraClass="sim-unit-icon" />
                        </span>
                        <span class="unit-name">
                          {unit.displayName || getUnitName(unit.type)}
                          {unit.level > 1 ? ` (Lvl ${unit.level})` : ''}
                        </span>
                        {#if uDef}
                          <span class="unit-stats-row">
                            {#if (uDef.meleeAttack||0) > 0}<span class="unit-stat-chip melee">M·{uDef.meleeAttack.toFixed(1)}</span>{/if}
                            {#if (uDef.rangedAttack||0) > 0}<span class="unit-stat-chip ranged">R·{uDef.rangedAttack.toFixed(1)}</span>{/if}
                            {#if (uDef.magicAttack||0) > 0}<span class="unit-stat-chip magic">Mg·{uDef.magicAttack.toFixed(1)}</span>{/if}
                          </span>
                        {/if}
                      </div>
                    {/each}
                  </div>

                  <div class="item-list">
                    <strong>Items: {Object.keys(group.items).length}</strong>
                    {#each Object.entries(group.items) as [itemId, quantity]}
                      <div class="item-row">
                        <span class="item-name {getRarityClass(ITEMS[itemId]?.rarity)}">
                          {getItemName(itemId)}
                          {quantity > 1 ? ` (${quantity})` : ''}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              </div>
            {/each}

            <button class="add-group-btn" on:click={() => addGroup(sideId)}>
              + Add Group
            </button>
          </div>
        </div>
      {/each}
    </div>

    <div class="control-panel">
      <div class="group-editor">
        <h3>Group Editor</h3>

        {#if selectedGroupId && getSelectedGroup()}
          <div class="editing-group">
            <p>Editing: {getSelectedGroup().name}</p>
          </div>

          <div class="editor-section">
            <h4>Add Unit</h4>
            <div class="input-group">
              <label>
                Unit Type:
                <select bind:value={selectedUnitType}>
                  {#each availableUnitTypes as unitType}
                    <option value={unitType.id}>{unitType.name}</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="input-group">
              <label>
                Unit Level:
                <input type="number" bind:value={unitLevel} min="1" max="10" />
              </label>
            </div>

            <button class="add-btn" on:click={addUnitToGroup}>
              Add Unit
            </button>
          </div>

          <div class="editor-section">
            <h4>Add Item</h4>
            <div class="input-group">
              <label>
                Item:
                <select bind:value={selectedItemId}>
                  {#each availableItems as item}
                    <option value={item.id}>
                      {item.name} (Power: {item.power})
                    </option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="input-group">
              <label>
                Quantity:
                <input type="number" bind:value={itemQuantity} min="1" max="10" />
              </label>
            </div>

            <button class="add-btn" on:click={addItemToGroup}>
              Add Item
            </button>
          </div>
        {:else}
          <p>Select a group to edit</p>
        {/if}
      </div>

      <div class="simulation-controls">
        <h3>Simulation Settings</h3>

        <p class="simulation-explanation">
          The simulator runs until a conclusive outcome is reached, just like in the game.
          Battles typically end when one side has no units left or has a decisive advantage.
        </p>

        <div class="sim-buttons">
          <button class="simulate-btn" on:click={runBattleSimulation} disabled={loading}>
            {loading ? 'Simulating...' : 'Start Battle Simulation'}
          </button>
        </div>
      </div>
    </div>
  </div>
  {:else if stepMode}
  <!-- Step-by-step mode UI -->
  <div class="simulation-results step-mode">
    <h3>Battle In Progress — Round {currentTick}</h3>

    <div class="step-status {getStepStatusClass(currentStepState)}">
      {getStepStatusText(currentStepState)}
    </div>

    <div class="casualties-summary">
      <div class="side-result">
        <h4>{side1.name}</h4>
        <div>Power: {currentStepState?.powers.side1Final.toFixed(1)}
          <span class="power-change {currentStepState?.powers.side1Final >= currentStepState?.powers.side1Initial ? 'power-increase' : 'power-decrease'}">
            ({(currentStepState?.powers.side1Final - currentStepState?.powers.side1Initial).toFixed(1)})
          </span>
        </div>
        <div>Casualties This Round: {currentStepState?.casualties.side1}</div>
        <div>Total Casualties: {currentStepState?.casualties.side1Total}</div>
        {#if currentStepState?.criticalHits.side1.length > 0}
          <div class="critical-hits">Critical Hits: {currentStepState.criticalHits.side1.length}</div>
        {/if}
      </div>

      <div class="side-result">
        <h4>{side2.name}</h4>
        <div>Power: {currentStepState?.powers.side2Final.toFixed(1)}
          <span class="power-change {currentStepState?.powers.side2Final >= currentStepState?.powers.side2Initial ? 'power-increase' : 'power-decrease'}">
            ({(currentStepState?.powers.side2Final - currentStepState?.powers.side2Initial).toFixed(1)})
          </span>
        </div>
        <div>Casualties This Round: {currentStepState?.casualties.side2}</div>
        <div>Total Casualties: {currentStepState?.casualties.side2Total}</div>
        {#if currentStepState?.criticalHits.side2.length > 0}
          <div class="critical-hits">Critical Hits: {currentStepState.criticalHits.side2.length}</div>
        {/if}
      </div>
    </div>

    <div class="step-controls">
      <button class="step-btn" on:click={stepForward}>Next Round →</button>
      <button class="auto-step-btn {autoStepMode ? 'active' : ''}" on:click={toggleAutoStep}>
        {autoStepMode ? 'Pause' : 'Resume Auto'}
      </button>
      <button class="fast-forward-btn" on:click={fastForward}>Fast Forward ⏩</button>
      <button class="reset-btn" on:click={resetSimulation}>Reset</button>
    </div>

    <div class="battle-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {(currentTick / maxTicks * 100)}%"></div>
      </div>
      <div class="tick-markers">
        {#each Array(maxTicks) as _, i}
          <div class="tick-marker {i < currentTick ? 'completed' : ''}" title="Round {i+1}"></div>
        {/each}
      </div>
    </div>

    {#if showingDetailedResults}
      <div class="battle-log">
        <h4>Battle Log</h4>
        <div class="log-entries">
          {#each battleLog as entry}
            <div class="log-entry {entry.type}">{entry.message}</div>
          {/each}
        </div>
      </div>
    {/if}

    <button class="toggle-btn" on:click={toggleDetailedResults}>
      {showingDetailedResults ? 'Hide Details' : 'Show Battle Details'}
    </button>
  </div>
  {:else}
  <!-- Final results UI -->
  <div class="simulation-results">
    <h3>Battle Results</h3>

    <div class="result-summary">
      {#if simulationResults.winner === 1}
        <div class="winner side1-winner">Side 1: {side1.name} Wins!</div>
      {:else if simulationResults.winner === 2}
        <div class="winner side2-winner">Side 2: {side2.name} Wins!</div>
      {:else}
        <div class="winner draw">Battle Ended in a Draw</div>
      {/if}

      <div class="casualties-summary">
        <div class="side-result">
          <h4>{side1.name}</h4>
          <div>Initial Power: {simulationResults.side1.initialPower.toFixed(1)}</div>
          <div>Final Power: {simulationResults.side1.finalPower.toFixed(1)}</div>
          <div>Casualties: {simulationResults.side1.casualties}</div>
          {#if simulationResults.criticalHits.side1.length > 0}
            <div class="critical-hits">Critical Hits: {simulationResults.criticalHits.side1.length}</div>
          {/if}
        </div>

        <div class="side-result">
          <h4>{side2.name}</h4>
          <div>Initial Power: {simulationResults.side2.initialPower.toFixed(1)}</div>
          <div>Final Power: {simulationResults.side2.finalPower.toFixed(1)}</div>
          <div>Casualties: {simulationResults.side2.casualties}</div>
          {#if simulationResults.criticalHits.side2.length > 0}
            <div class="critical-hits">Critical Hits: {simulationResults.criticalHits.side2.length}</div>
          {/if}
        </div>
      </div>
    </div>

    <div class="result-actions">
      <button class="toggle-btn" on:click={toggleDetailedResults}>
        {showingDetailedResults ? 'Hide Details' : 'Show Battle Details'}
      </button>
      <button class="reset-btn" on:click={resetSimulation}>Reset Simulation</button>
    </div>

    {#if showingDetailedResults}
      <div class="battle-log">
        <h4>Battle Log</h4>
        <div class="log-entries">
          {#each battleLog as entry}
            <div class="log-entry {entry.type}">{entry.message}</div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  {/if}

  <div class="simulator-footer">
    <h3>How Battle Mechanics Work</h3>
    <div class="mechanics-explanation">
      <p>
        The battle simulator uses Gisaima's actual battle calculations from <code>shared/war/battles.js</code>,
        running the same per-round phases as the live <code>battleTick</code>:
      </p>
      <ol>
        <li><strong>Group Power</strong>: Each group's power is summed from its units' typed attacks and item power</li>
        <li><strong>Power Ratios</strong>: The relative strength of each side affects casualty rates</li>
        <li><strong>PvP Detection</strong>: If player units are present on both sides, critical hit mechanics apply</li>
        <li><strong>Typed Defense</strong>: Each side's melee/ranged/magic defense reduces incoming attrition by matchup</li>
        <li><strong>Attrition</strong>: Each side takes casualties based on power ratio and the defense multiplier</li>
        <li><strong>Casualty Selection</strong>: Units are removed by type, with player and critical-hit protection</li>
      </ol>
      <p><strong>Key factors affecting battle outcomes:</strong></p>
      <ul>
        <li>Total power of each side and the melee/ranged/magic matchup between them</li>
        <li>Presence of player units (which get special protection)</li>
        <li>Critical hits in PvP battles, including multi-player combo criticals</li>
        <li>Battle duration (longer battles increase critical hit chances and force resolution)</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .battle-simulator {
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 0.5em;
    border: 0.05em solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 0.2em 1em rgba(0, 0, 0, 0.1);
    padding: 1.5em;
    margin: 2em 0;
    color: rgba(0, 0, 0, 0.8);
  }

  .battle-simulator h2 {
    color: rgba(0, 0, 0, 0.8);
    margin-top: 0;
    font-size: 1.8em;
    margin-bottom: 0.8em;
    font-family: var(--font-heading);
    font-weight: 600;
  }

  .simulator-intro {
    margin-bottom: 1.5em;
  }

  .simulator-config {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
  }

  .simulator-sides {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
  }

  @media (min-width: 768px) {
    .simulator-sides {
      flex-direction: row;
      gap: 2em;
    }
  }

  .side-config {
    flex: 1;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 0.5em;
    padding: 1em;
  }

  .side-config h3 {
    margin-top: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 1.4em;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 0.5em;
    margin-bottom: 0.5em;
  }

  .side-power {
    font-weight: bold;
    font-size: 1.1em;
    margin-bottom: 1em;
  }

  .groups-container {
    display: flex;
    flex-direction: column;
    gap: 1em;
  }

  .group-card {
    background-color: white;
    border-radius: 0.5em;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1em;
    transition: all 0.2s ease;
  }

  .group-card.selected {
    box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.5);
    border-color: rgba(66, 133, 244, 0.5);
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1em;
  }

  .group-header h4 {
    margin: 0;
    flex: 1;
    font-size: 1.1em;
  }

  .group-power {
    margin-right: 1em;
    font-size: 0.9em;
    color: rgba(0, 0, 0, 0.6);
  }

  .select-btn, .delete-btn {
    padding: 0.2em 0.5em;
    font-size: 0.8em;
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.3em;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-left: 0.5em;
  }

  .select-btn:hover {
    background: rgba(66, 133, 244, 0.1);
    border-color: rgba(66, 133, 244, 0.2);
  }

  .delete-btn:hover {
    background: rgba(244, 67, 54, 0.1);
    border-color: rgba(244, 67, 54, 0.2);
    color: rgba(244, 67, 54, 0.8);
  }

  .group-content {
    display: flex;
    gap: 1em;
    font-size: 0.9em;
  }

  .unit-list, .item-list {
    flex: 1;
  }

  .unit-item, .item-row {
    margin-top: 0.5em;
    display: flex;
    align-items: center;
  }

  .unit-name, .item-name {
    background: rgba(0, 0, 0, 0.03);
    padding: 0.2em 0.5em;
    border-radius: 0.3em;
    display: inline-block;
    font-size: 0.9em;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .item-name.common {
    background: rgba(158, 158, 158, 0.1);
    border-color: rgba(158, 158, 158, 0.3);
  }

  .unit-item {
    flex-wrap: wrap;
    gap: 0.3em;
  }

  .unit-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5em;
    height: 1.5em;
    flex-shrink: 0;
  }

  :global(.sim-unit-icon) {
    width: 1.4em;
    height: 1.4em;
    fill: rgba(0, 0, 0, 0.7);
    color: rgba(0, 0, 0, 0.7);
  }

  .unit-stats-row {
    display: flex;
    gap: 0.2em;
    flex-wrap: wrap;
    align-items: center;
  }

  .unit-stat-chip {
    font-size: 0.72em;
    padding: 0.1em 0.35em;
    border-radius: 0.2em;
    font-family: monospace;
    border: 1px solid rgba(0,0,0,0.15);
  }
  .unit-stat-chip.melee { background: rgba(180, 30, 30, 0.1); border-color: rgba(180, 30, 30, 0.3); color: #a02020; }
  .unit-stat-chip.ranged { background: rgba(30, 100, 30, 0.1); border-color: rgba(30, 100, 30, 0.3); color: #1a6020; }
  .unit-stat-chip.magic { background: rgba(80, 30, 140, 0.1); border-color: rgba(80, 30, 140, 0.3); color: #5020a0; }

  .item-name.uncommon {
    background: rgba(76, 175, 80, 0.1);
    border-color: rgba(76, 175, 80, 0.3);
    color: rgba(46, 125, 50, 0.9);
  }

  .item-name.rare {
    background: rgba(33, 150, 243, 0.1);
    border-color: rgba(33, 150, 243, 0.3);
    color: rgba(2, 119, 189, 0.9);
  }

  .item-name.epic {
    background: rgba(156, 39, 176, 0.1);
    border-color: rgba(156, 39, 176, 0.3);
    color: rgba(123, 31, 162, 0.9);
  }

  .add-group-btn {
    background: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.3em;
    padding: 0.7em;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
    color: rgba(0, 0, 0, 0.6);
  }

  .add-group-btn:hover {
    background: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.8);
  }

  .control-panel {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5em;
  }

  @media (min-width: 768px) {
    .control-panel {
      grid-template-columns: 1fr 1fr;
      gap: 2em;
    }
  }

  .group-editor, .simulation-controls {
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 0.5em;
    padding: 1em;
  }

  .group-editor h3, .simulation-controls h3 {
    margin-top: 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 0.5em;
    font-size: 1.2em;
    margin-bottom: 1em;
  }

  .editor-section {
    margin-bottom: 1.5em;
    padding-bottom: 1.5em;
    border-bottom: 1px dashed rgba(0, 0, 0, 0.1);
  }

  .editor-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .editor-section h4 {
    margin-top: 0;
    margin-bottom: 0.8em;
    font-size: 1em;
    color: rgba(0, 0, 0, 0.7);
  }

  .input-group {
    margin-bottom: 1em;
  }

  .input-group label {
    display: block;
    margin-bottom: 0.5em;
    color: rgba(0, 0, 0, 0.7);
  }

  .input-group select, .input-group input[type="number"] {
    width: 100%;
    padding: 0.5em;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 0.3em;
  }

  .add-btn, .simulate-btn {
    background-color: rgba(66, 133, 244, 0.1);
    border: 1px solid rgba(66, 133, 244, 0.3);
    color: rgba(66, 133, 244, 0.8);
    padding: 0.7em 1em;
    border-radius: 0.3em;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease;
    width: 100%;
    margin-top: 0.5em;
  }

  .add-btn:hover, .simulate-btn:hover {
    background-color: rgba(66, 133, 244, 0.2);
    color: rgba(66, 133, 244, 1);
  }

  .simulate-btn {
    background-color: rgba(66, 133, 244, 0.8);
    color: white;
    font-size: 1.1em;
    padding: 0.8em;
    margin-top: 1.5em;
    flex: 1;
  }

  .simulate-btn:hover {
    background-color: rgba(66, 133, 244, 1);
    color: white;
  }

  .simulate-btn:disabled {
    background-color: rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.4);
    cursor: not-allowed;
    border-color: rgba(0, 0, 0, 0.1);
  }

  /* Results styling */
  .simulation-results {
    background-color: rgba(255, 255, 255, 0.5);
    border-radius: 0.5em;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 1.5em;
  }

  .simulation-results h3 {
    margin-top: 0;
    text-align: center;
    font-size: 1.4em;
    margin-bottom: 1em;
    color: rgba(0, 0, 0, 0.8);
  }

  .result-summary {
    display: flex;
    flex-direction: column;
    gap: 1.5em;
    align-items: center;
  }

  .winner {
    font-size: 1.5em;
    font-weight: bold;
    text-align: center;
    padding: 0.8em 1.5em;
    border-radius: 0.5em;
    color: white;
    width: 100%;
    max-width: 500px;
  }

  .side1-winner {
    background-color: rgba(33, 150, 243, 0.8);
  }

  .side2-winner {
    background-color: rgba(244, 67, 54, 0.8);
  }

  .draw {
    background-color: rgba(158, 158, 158, 0.8);
  }

  .casualties-summary {
    display: flex;
    width: 100%;
    gap: 2em;
    justify-content: center;
    flex-wrap: wrap;
  }

  .side-result {
    background-color: white;
    border-radius: 0.5em;
    padding: 1em;
    flex: 1;
    min-width: 200px;
    max-width: 300px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .side-result h4 {
    margin-top: 0;
    margin-bottom: 0.8em;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    padding-bottom: 0.5em;
  }

  .critical-hits {
    margin-top: 0.5em;
    color: rgb(156, 39, 176);
    font-weight: bold;
  }

  .result-actions {
    display: flex;
    justify-content: center;
    gap: 1em;
    margin-top: 2em;
    flex-wrap: wrap;
  }

  .toggle-btn, .reset-btn {
    padding: 0.8em 1.5em;
    border-radius: 0.3em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn {
    background-color: rgba(0, 0, 0, 0.05);
    border: 1px solid rgba(0, 0, 0, 0.1);
    color: rgba(0, 0, 0, 0.7);
  }

  .toggle-btn:hover {
    background-color: rgba(0, 0, 0, 0.08);
    color: rgba(0, 0, 0, 0.9);
  }

  .reset-btn {
    background-color: rgba(244, 67, 54, 0.1);
    border: 1px solid rgba(244, 67, 54, 0.3);
    color: rgba(244, 67, 54, 0.8);
  }

  .reset-btn:hover {
    background-color: rgba(244, 67, 54, 0.2);
    color: rgba(244, 67, 54, 1);
  }

  .battle-log {
    margin-top: 2em;
    background-color: rgba(0, 0, 0, 0.03);
    border-radius: 0.5em;
    padding: 1em;
    border: 1px solid rgba(0, 0, 0, 0.05);
  }

  .battle-log h4 {
    margin-top: 0;
    margin-bottom: 1em;
    text-align: center;
  }

  .log-entries {
    max-height: 300px;
    overflow-y: auto;
    font-family: var(--font-mono, monospace);
    background-color: rgba(0, 0, 0, 0.02);
    padding: 0.5em;
    border-radius: 0.3em;
  }

  .log-entry {
    padding: 0.3em 0;
    border-bottom: 1px dashed rgba(0, 0, 0, 0.05);
    line-height: 1.4;
    white-space: pre-wrap;
    font-size: 0.9em;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-entry.error {
    color: #d32f2f;
  }

  .log-entry.important {
    color: #0277bd;
    font-weight: bold;
  }

  .log-entry.critical {
    color: #7b1fa2;
    font-weight: bold;
  }

  /* Footer section */
  .simulator-footer {
    margin-top: 3em;
    padding: 1em;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    background-color: rgba(0, 0, 0, 0.02);
    border-radius: 0.5em;
  }

  .simulator-footer h3 {
    text-align: center;
    font-size: 1.3em;
    margin-top: 0;
    margin-bottom: 1em;
    color: rgba(0, 0, 0, 0.8);
  }

  .mechanics-explanation {
    color: rgba(0, 0, 0, 0.7);
  }

  .mechanics-explanation p {
    margin-bottom: 1em;
    line-height: 1.6;
  }

  .mechanics-explanation ol, .mechanics-explanation ul {
    padding-left: 1.5em;
    margin-bottom: 1.5em;
  }

  .mechanics-explanation li {
    margin-bottom: 0.5em;
    line-height: 1.6;
  }

  .mechanics-explanation strong {
    color: rgba(0, 0, 0, 0.8);
  }

  .mechanics-explanation code {
    font-family: var(--font-mono, monospace);
    background: rgba(0, 0, 0, 0.05);
    padding: 0.1em 0.3em;
    border-radius: 0.2em;
    font-size: 0.9em;
  }

  /* Step-by-step mode */
  .sim-buttons {
    display: flex;
    gap: 0.8em;
    flex-wrap: wrap;
    margin-top: 1.5em;
  }

  .step-btn {
    background-color: rgba(76, 175, 80, 0.8);
    color: white;
    padding: 0.8em 1em;
    border-radius: 0.3em;
    border: none;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .step-btn:hover {
    background-color: rgba(76, 175, 80, 1);
  }

  .fast-forward-btn {
    background-color: rgba(255, 152, 0, 0.8);
    color: white;
    padding: 0.8em 1em;
    border-radius: 0.3em;
    border: none;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .fast-forward-btn:hover {
    background-color: rgba(255, 152, 0, 1);
  }

  .step-mode {
    border: 2px solid rgba(0, 0, 0, 0.1);
  }

  .step-status {
    text-align: center;
    font-size: 1.2em;
    font-weight: bold;
    padding: 0.5em;
    border-radius: 0.3em;
    margin: 1em 0;
  }

  .side1-winning {
    background-color: rgba(33, 150, 243, 0.1);
    color: rgba(33, 150, 243, 0.9);
    border: 1px solid rgba(33, 150, 243, 0.3);
  }

  .side2-winning {
    background-color: rgba(244, 67, 54, 0.1);
    color: rgba(244, 67, 54, 0.9);
    border: 1px solid rgba(244, 67, 54, 0.3);
  }

  .even-battle {
    background-color: rgba(158, 158, 158, 0.1);
    color: rgba(158, 158, 158, 0.9);
    border: 1px solid rgba(158, 158, 158, 0.3);
  }

  .step-controls {
    display: flex;
    gap: 1em;
    justify-content: center;
    margin: 1.5em 0;
    flex-wrap: wrap;
  }

  .battle-progress {
    margin: 1.5em 0;
  }

  .progress-bar {
    width: 100%;
    height: 0.6em;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 1em;
    overflow: hidden;
    margin-bottom: 0.5em;
  }

  .progress-fill {
    height: 100%;
    background-color: rgba(76, 175, 80, 0.7);
    transition: width 0.3s ease;
  }

  .tick-markers {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .tick-marker {
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .tick-marker.completed {
    background-color: rgba(76, 175, 80, 0.7);
  }

  .power-change {
    font-size: 0.9em;
    margin-left: 0.3em;
  }

  .power-increase {
    color: #4caf50;
  }

  .power-decrease {
    color: #f44336;
  }

  .auto-step-btn {
    background-color: rgba(156, 39, 176, 0.8);
    color: white;
    padding: 0.8em 1em;
    border-radius: 0.3em;
    border: none;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auto-step-btn:hover {
    background-color: rgba(156, 39, 176, 1);
  }

  .auto-step-btn.active {
    background-color: rgba(244, 67, 54, 0.8);
    animation: pulse 1.5s infinite;
  }

  .auto-step-btn.active:hover {
    background-color: rgba(244, 67, 54, 1);
  }

  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
  }
</style>
