<script>
    import Stamp from '../../components/ui/Stamp.svelte';
    import Flourish from '../../components/ui/Flourish.svelte';
    import Button from '../../components/ui/Button.svelte';
    import WaxSeal from '../../components/ui/WaxSeal.svelte';
    import CompassRose from '../../components/ui/CompassRose.svelte';

    let step = $state(0);

    const steps = [
        {
            glyph: 'compass',
            title: 'The realm receives you',
            body: 'Gisaima is a real-time, tick-based world. Time moves whether you watch or not. The map is endless; what you claim, you keep.',
            cta: 'Walk on'
        },
        {
            glyph: 'banner',
            title: 'Choose a flag',
            body: 'Name your house. The Chronicle will remember it. Banners may join a tribe, or stand alone.',
            cta: 'Raise it'
        },
        {
            glyph: 'wheat',
            title: 'Gather, build, fight',
            body: 'Most lieges begin by gathering — wood, stone, food. Then a wall. Then a sword. The order is yours.',
            cta: 'I understand'
        },
        {
            glyph: 'eye',
            title: 'The world is watching',
            body: 'Bad deeds gain visibility, like a beacon. Good deeds gain seals. Reports are written about you in the field.',
            cta: 'Continue'
        },
        {
            glyph: 'crown',
            title: 'Begin your reign',
            body: 'A spawn point will be chosen for you on the rim of the realm. From there, the rest is up to you.',
            cta: 'Enter the realm'
        }
    ];

    const current = $derived(steps[step]);
    const pct = $derived(((step + 1) / steps.length) * 100);

    function next() {
        if (step < steps.length - 1) step += 1;
        else window.location.href = '/worlds';
    }
    function back() {
        if (step > 0) step -= 1;
    }
</script>

<svelte:head><title>The First Tick — Gisaima</title></svelte:head>

<div class="page">
    <div class="frame">
        <div class="rose"><CompassRose size={520} color="var(--color-aged-gold)" opacity={0.18} /></div>

        <div class="content">
            <div class="progress">
                <div class="fill" style="width: {pct}%;"></div>
            </div>
            <div class="step-no">STEP {step + 1} · OF {steps.length}</div>

            <div class="seal"><WaxSeal glyph={current.glyph} color="#5b1a1f" size={84} /></div>

            <h1>{current.title}</h1>
            <p class="body">{current.body}</p>

            <Flourish extraClass="page-flourish" />

            <div class="cta">
                <Button variant="ghost" onclick={back} disabled={step === 0}>
                    ← Back
                </Button>
                <Button variant="primary" onclick={next}>
                    {current.cta}
                    <Stamp kind="compass" size={14} />
                </Button>
            </div>

            <a class="skip" href="/worlds">skip the rite</a>
        </div>
    </div>
</div>

<style>
    .page { position: relative; z-index: 2; min-height: calc(100vh - 6em); display: flex; align-items: center; justify-content: center; padding: 7em 2em 4em; color: var(--color-ink-900); }
    .frame { position: relative; max-width: 640px; width: 100%; background: var(--color-parchment-100); border: 1px solid var(--color-ink-900); padding: 3em 3em 2em; text-align: center; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15); }
    .rose { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; opacity: 0.5; }
    .content { position: relative; z-index: 2; }
    .progress { height: 2px; background: var(--color-parchment-300); margin-bottom: 1em; }
    .progress .fill { height: 100%; background: var(--color-wax-red); transition: width 0.3s ease; }
    .step-no { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; color: var(--color-ink-500); }
    .seal { display: flex; justify-content: center; margin: 1.5em 0 1em; }
    h1 { font-family: var(--font-display); font-size: 2rem; letter-spacing: 0.04em; margin: 0.5em 0; }
    .body { font-family: var(--font-editorial); font-size: 1.1rem; line-height: 1.5; color: var(--color-ink-700); max-width: 460px; margin: 0 auto 1.5em; }
    .cta { display: flex; justify-content: center; gap: 1em; margin-top: 1.5em; }
    .skip { display: inline-block; margin-top: 1.5em; font-family: var(--font-editorial); font-style: italic; font-size: 0.85rem; color: var(--color-ink-500); }
    @media (max-width: 600px) {
        .frame { padding: 2em 1.5em; }
        h1 { font-size: 1.5rem; }
    }
</style>
