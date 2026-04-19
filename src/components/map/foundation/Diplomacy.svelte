<script>
  import { fly } from 'svelte/transition';
  import { game } from '../../../lib/stores/game.js';
  import { user } from '../../../lib/stores/user.js';
  import { diplomacy, getMyTribe } from '../../../lib/stores/diplomacy.js';
  import Close from '../../icons/Close.svelte';

  const { onClose = () => {}, onMouseEnter = () => {} } = $props();

  let view = $state('list'); // 'list' | 'create'
  let createName = $state('');
  let createTag = $state('');
  let createDesc = $state('');
  let error = $state('');
  let saving = $state(false);

  const worldId = $derived($game.worldKey);
  const uid = $derived($user?.uid);
  const tribes = $derived($diplomacy.tribes);
  const loading = $derived($diplomacy.loading);
  const myTribe = $derived(getMyTribe(tribes, uid));

  async function handleCreate() {
    error = '';
    if (!createName.trim() || !createTag.trim()) { error = 'Name and tag are required.'; return; }
    saving = true;
    try {
      const result = await diplomacy.createTribe(worldId, createName, createTag, createDesc);
      if (result.success) { view = 'list'; createName = ''; createTag = ''; createDesc = ''; }
      else error = result.error || 'Failed to create tribe.';
    } catch (e) {
      error = e.message || 'Failed to create tribe.';
    } finally {
      saving = false;
    }
  }

  async function handleJoin(tribeId) {
    error = '';
    saving = true;
    try {
      const result = await diplomacy.joinTribe(worldId, tribeId);
      if (!result.success) error = result.error || 'Failed to join tribe.';
    } catch (e) {
      error = e.message || 'Failed to join.';
    } finally {
      saving = false;
    }
  }

  async function handleLeave() {
    error = '';
    saving = true;
    try {
      const result = await diplomacy.leaveTribe(worldId);
      if (!result.success) error = result.error || 'Failed to leave tribe.';
    } catch (e) {
      error = e.message || 'Failed to leave.';
    } finally {
      saving = false;
    }
  }
</script>

<div
  class="diplomacy-container"
  role="region"
  aria-label="Diplomacy"
  onmouseenter={onMouseEnter}
  transition:fly={{ y: -20, duration: 200 }}
>
  <div class="panel-header">
    <h3>Diplomacy</h3>
    <button class="close-btn" onclick={onClose} aria-label="Close diplomacy">
      <Close size="1em" />
    </button>
  </div>

  {#if view === 'create'}
    <div class="panel-body">
      <button class="back-link" onclick={() => { view = 'list'; error = ''; }}>← Back</button>
      <h4>Create a Tribe</h4>
      <label class="field-label">
        Tribe Name
        <input class="field-input" bind:value={createName} maxlength="40" placeholder="e.g. Iron Brotherhood" disabled={saving} />
      </label>
      <label class="field-label">
        Tag <span class="hint">(up to 5 chars)</span>
        <input class="field-input tag-input" bind:value={createTag} maxlength="5" placeholder="IBH" disabled={saving} />
      </label>
      <label class="field-label">
        Description <span class="hint">(optional)</span>
        <textarea class="field-input" bind:value={createDesc} maxlength="200" rows="3" placeholder="What is your tribe about?" disabled={saving}></textarea>
      </label>
      {#if error}<div class="error">{error}</div>{/if}
      <div class="row-actions">
        <button class="btn-secondary" onclick={() => { view = 'list'; error = ''; }} disabled={saving}>Cancel</button>
        <button class="btn-primary" onclick={handleCreate} disabled={saving || !createName.trim() || !createTag.trim()}>
          {saving ? 'Creating…' : 'Create Tribe'}
        </button>
      </div>
    </div>

  {:else}
    <div class="panel-body">
      {#if myTribe}
        <div class="my-tribe">
          <div class="tribe-badge">[{myTribe.tag}]</div>
          <div class="tribe-name-row">
            <span class="tribe-name">{myTribe.name}</span>
            {#if myTribe.leaderId === uid}<span class="leader-chip">Leader</span>{/if}
          </div>
          {#if myTribe.description}<p class="tribe-desc">{myTribe.description}</p>{/if}
          <div class="members-label">{myTribe.members?.length || 0} member{myTribe.members?.length !== 1 ? 's' : ''}</div>
          <ul class="members-list">
            {#each (myTribe.members || []) as m}
              <li class:leader={m.uid === myTribe.leaderId}>{m.displayName}{m.uid === myTribe.leaderId ? ' ★' : ''}</li>
            {/each}
          </ul>
          {#if error}<div class="error">{error}</div>{/if}
          <button class="btn-danger" onclick={handleLeave} disabled={saving}>
            {saving ? 'Leaving…' : myTribe.leaderId === uid ? 'Disband / Leave' : 'Leave Tribe'}
          </button>
        </div>
        <div class="section-divider"></div>
      {/if}

      <div class="section-title">
        All Tribes
        {#if !myTribe}<button class="btn-primary small" onclick={() => { view = 'create'; error = ''; }}>+ Create</button>{/if}
      </div>

      {#if loading}
        <div class="empty">Loading…</div>
      {:else if tribes.length === 0}
        <div class="empty">No tribes in this world yet.</div>
      {:else}
        <ul class="tribe-list">
          {#each tribes as t (t._id)}
            <li class="tribe-item" class:mine={t._id === myTribe?._id}>
              <div class="tribe-item-header">
                <span class="tribe-tag">[{t.tag}]</span>
                <span class="tribe-item-name">{t.name}</span>
                <span class="tribe-members">{t.members?.length || 0}</span>
              </div>
              {#if t.description}<p class="tribe-item-desc">{t.description}</p>{/if}
              {#if !myTribe && t._id !== myTribe?._id}
                <button class="btn-secondary small" onclick={() => handleJoin(t._id)} disabled={saving}>Join</button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if error && view === 'list'}<div class="error">{error}</div>{/if}
    </div>
  {/if}
</div>

<style>
  .diplomacy-container {
    display: flex;
    flex-direction: column;
    background-color: rgba(255, 255, 255, 0.85);
    border-radius: 0.5rem;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    overflow: hidden;
    box-shadow: 0 0.2em 1em rgba(0, 0, 0, 0.1);
    border: 0.05em solid rgba(255, 255, 255, 0.2);
    width: min(380px, 90vw);
    max-height: 70vh;
    color: rgba(0, 0, 0, 0.8);
    text-shadow: 0 0 0.15em rgba(255, 255, 255, 0.7);
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background-color: rgba(0, 0, 0, 0.05);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    flex-shrink: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.8);
    font-family: var(--font-heading);
  }

  h4 {
    margin: 0 0 0.8em;
    font-size: 1rem;
    font-family: var(--font-heading);
    color: rgba(0, 0, 0, 0.75);
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .close-btn:hover { color: rgba(0, 0, 0, 0.9); }

  .panel-body {
    overflow-y: auto;
    flex: 1;
    padding: 0.8em 1em;
    display: flex;
    flex-direction: column;
    gap: 0.6em;
  }

  .back-link {
    background: none;
    border: none;
    color: rgba(66, 133, 244, 0.85);
    cursor: pointer;
    padding: 0;
    font-size: 0.85em;
    align-self: flex-start;
    font-family: var(--font-body);
  }

  .field-label {
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    font-size: 0.85em;
    color: rgba(0, 0, 0, 0.65);
  }

  .hint { color: rgba(0,0,0,0.4); font-size: 0.85em; }

  .field-input {
    padding: 0.4em 0.6em;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 0.3em;
    font-family: var(--font-body);
    font-size: 0.95em;
    color: rgba(0, 0, 0, 0.8);
    background: rgba(255, 255, 255, 0.7);
    resize: vertical;
  }
  .field-input:focus { outline: none; border-color: rgba(66, 133, 244, 0.6); }

  .tag-input { max-width: 6em; text-transform: uppercase; }

  .section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85em;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .section-divider {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    margin: 0.2em 0;
  }

  .my-tribe {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .tribe-badge {
    font-size: 0.75em;
    font-weight: 700;
    color: rgba(66, 133, 244, 0.85);
    letter-spacing: 0.04em;
  }

  .tribe-name-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  .tribe-name {
    font-size: 1.05em;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
  }

  .leader-chip {
    font-size: 0.7em;
    background: rgba(66, 133, 244, 0.12);
    color: rgba(30, 80, 200, 0.85);
    padding: 0.1em 0.45em;
    border-radius: 1em;
    font-weight: 600;
  }

  .tribe-desc {
    margin: 0;
    font-size: 0.82em;
    color: rgba(0, 0, 0, 0.55);
    line-height: 1.4;
  }

  .members-label {
    font-size: 0.78em;
    color: rgba(0, 0, 0, 0.45);
    margin-top: 0.2em;
  }

  .members-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3em;
  }

  .members-list li {
    font-size: 0.8em;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 0.3em;
    padding: 0.15em 0.45em;
    color: rgba(0, 0, 0, 0.65);
  }

  .members-list li.leader {
    background: rgba(66, 133, 244, 0.1);
    color: rgba(30, 80, 200, 0.85);
  }

  .tribe-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }

  .tribe-item {
    padding: 0.55em 0.7em;
    background: rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 0.35em;
  }

  .tribe-item.mine {
    border-color: rgba(66, 133, 244, 0.3);
    background: rgba(66, 133, 244, 0.05);
  }

  .tribe-item-header {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin-bottom: 0.2em;
  }

  .tribe-tag {
    font-size: 0.72em;
    font-weight: 700;
    color: rgba(66, 133, 244, 0.8);
    letter-spacing: 0.03em;
  }

  .tribe-item-name {
    font-size: 0.9em;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    flex: 1;
  }

  .tribe-members {
    font-size: 0.75em;
    color: rgba(0, 0, 0, 0.4);
  }

  .tribe-item-desc {
    margin: 0 0 0.4em;
    font-size: 0.78em;
    color: rgba(0, 0, 0, 0.5);
    line-height: 1.4;
  }

  .empty {
    color: rgba(0, 0, 0, 0.4);
    text-align: center;
    padding: 1.5em 1em;
    font-size: 0.9em;
  }

  .error {
    font-size: 0.82em;
    color: rgb(180, 40, 40);
    background: rgba(200, 50, 50, 0.08);
    padding: 0.4em 0.6em;
    border-radius: 0.3em;
  }

  .row-actions {
    display: flex;
    gap: 0.5em;
    justify-content: flex-end;
  }

  .btn-primary {
    background: rgba(66, 133, 244, 0.85);
    color: #fff;
    border: none;
    border-radius: 0.3em;
    padding: 0.45em 0.9em;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.88em;
    font-weight: 500;
    transition: background 0.15s;
  }
  .btn-primary:hover:not(:disabled) { background: rgba(40, 100, 220, 0.9); }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-primary.small { padding: 0.25em 0.65em; font-size: 0.78em; }

  .btn-secondary {
    background: rgba(0, 0, 0, 0.06);
    color: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.3em;
    padding: 0.45em 0.9em;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.88em;
    transition: background 0.15s;
  }
  .btn-secondary:hover:not(:disabled) { background: rgba(0, 0, 0, 0.1); }
  .btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-secondary.small { padding: 0.25em 0.65em; font-size: 0.78em; }

  .btn-danger {
    background: rgba(200, 50, 50, 0.1);
    color: rgb(160, 30, 30);
    border: 1px solid rgba(200, 50, 50, 0.2);
    border-radius: 0.3em;
    padding: 0.45em 0.9em;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.82em;
    align-self: flex-start;
    transition: background 0.15s;
  }
  .btn-danger:hover:not(:disabled) { background: rgba(200, 50, 50, 0.18); }
  .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
