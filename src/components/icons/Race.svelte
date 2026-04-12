<script>
    import Human from './Human.svelte'
    import Elf from './Elf.svelte'
    import Dwarf from './Dwarf.svelte'
    import Goblin from './Goblin.svelte'
    import Fairy from './Fairy.svelte'

    const { raceKey, extraClass = '' } = $props();
    
    const races = {
        human: Human,
        elf: Elf,
        dwarf: Dwarf,
        goblin: Goblin,
        fairy: Fairy
    }

    const Icon = $derived(races[raceKey?.toLowerCase()])
</script>

{#if Icon}
    <Icon extraClass={extraClass} />
{/if}