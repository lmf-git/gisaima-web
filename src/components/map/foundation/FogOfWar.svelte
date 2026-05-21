<script>
  import { derived } from 'svelte/store';
  import { user } from '../../../lib/stores/user';
  import { entities, map, currentPlayerPosition } from '../../../lib/stores/map.js';

  // Default sight radii — mirror api/lib/visibility.js so the visual reveal
  // matches what the server will actually send entity data for.
  const PLAYER_SIGHT    = 2;
  const GROUP_SIGHT     = 2;
  const STRUCTURE_SIGHT = 1;
  const STRUCTURE_OVERRIDES = { watchtower: 2, outpost: 3, spawn: 2 };

  // Union of all the player's sight sources as { x, y, r } in world coords.
  const sightSources = derived(
    [user, entities, currentPlayerPosition],
    ([$user, $entities, $pos]) => {
      const uid = $user?.uid;
      if (!uid) return [];
      const out = [];

      if ($pos) out.push({ x: $pos.x, y: $pos.y, r: PLAYER_SIGHT });

      for (const groups of Object.values($entities.groups || {})) {
        if (!Array.isArray(groups)) continue;
        for (const g of groups) {
          if (g?.owner !== uid) continue;
          out.push({ x: g.x, y: g.y, r: g.sightRange ?? GROUP_SIGHT });
        }
      }

      for (const s of Object.values($entities.structure || {})) {
        if (s?.owner !== uid) continue;
        const r = s.sightRange ?? STRUCTURE_OVERRIDES[s.type] ?? STRUCTURE_SIGHT;
        out.push({ x: s.x, y: s.y, r });
      }

      return out;
    }
  );

  // Project a world sight source into viewBox units (1 unit = 1 tile).
  // r is bumped by 0.5 so the visible circle extends to the far edge of the
  // last revealed tile rather than its centre.
  function project(src, $map) {
    const viewportCenterX = Math.floor($map.cols / 2);
    const viewportCenterY = Math.floor($map.rows / 2);
    const cx = viewportCenterX + (src.x - $map.target.x) + 0.5;
    const cy = viewportCenterY + (src.y - $map.target.y) + 0.5;
    return { cx, cy, r: src.r + 0.5 };
  }
</script>

{#if $map.ready && $map.cols > 0 && $map.rows > 0}
  <svg
    class="fog-layer"
    viewBox="0 0 {$map.cols} {$map.rows}"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <!-- Reveal gradient: black at the centre (fully hides the dark rect)
           fading to white at the rim (rim of the circle leaves the dark
           rect fully visible) → torchlight edges. -->
      <radialGradient id="fog-reveal" cx="50%" cy="50%" r="50%">
        <stop offset="0%"  stop-color="black" />
        <stop offset="55%" stop-color="black" />
        <stop offset="100%" stop-color="white" />
      </radialGradient>

      <!-- Mask space matches the viewBox so the rect we draw fills the
           same coordinate system. White = the dark rect shows; black =
           the dark rect is hidden (the reveal). -->
      <mask id="fog-mask" maskUnits="userSpaceOnUse"
            x="0" y="0" width={$map.cols} height={$map.rows}>
        <rect x="0" y="0" width={$map.cols} height={$map.rows} fill="white" />
        {#each $sightSources as src}
          {@const p = project(src, $map)}
          <circle cx={p.cx} cy={p.cy} r={p.r} fill="url(#fog-reveal)" />
        {/each}
      </mask>
    </defs>

    <rect
      x="0" y="0"
      width={$map.cols} height={$map.rows}
      fill="rgba(0, 0, 0, 0.75)"
      mask="url(#fog-mask)"
    />
  </svg>
{/if}

<style>
  .fog-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 900;
  }
</style>
