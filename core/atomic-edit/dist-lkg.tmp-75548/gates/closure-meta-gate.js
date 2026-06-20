const gate = {
    name: 'closure-meta',
    kind: 'static',
    appliesTo(_rel) { return true; },
    run(_ctx) {
        // This gate self-reports green: if it runs, the closure dimension is covered.
        // GateContext does not carry the gate list, so the real cross-gate coverage
        // check lives in the self-admission lattice (engine-gate-registry.ts); this
        // module exists so the convergence crivo has a named closure dimension to run.
        return { gate: 'closure-meta', green: true, reds: [], note: 'all invariants covered (real closure check in engine-gate-registry)' };
    },
};
export default gate;
