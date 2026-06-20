const TS_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
async function moduleExportSurface(rel, text) {
    let tsMorph;
    try {
        tsMorph = await import('ts-morph');
    }
    catch {
        return null;
    }
    const { Project, SyntaxKind } = tsMorph;
    try {
        const proj = new Project({
            useInMemoryFileSystem: true,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: { allowJs: true, noLib: true, noResolve: true },
        });
        const ext = TS_RE.exec(rel)?.[1] ?? 'ts';
        const sf = proj.createSourceFile(`/__module__.${ext}`, text, { overwrite: true });
        const names = new Set();
        for (const s of sf.getExportSymbols())
            names.add(s.getName());
        for (const k of sf.getExportedDeclarations().keys())
            names.add(k);
        const hasStar = sf
            .getDescendantsOfKind(SyntaxKind.ExportDeclaration)
            .some((e) => e.isNamespaceExport());
        return { names, hasStar };
    }
    catch {
        return null;
    }
}
async function namedImportsFrom(ctx, importerRel, importerText, targetRel) {
    let tsMorph;
    try {
        tsMorph = await import('ts-morph');
    }
    catch {
        return null;
    }
    const { Project } = tsMorph;
    try {
        const proj = new Project({
            useInMemoryFileSystem: true,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: { allowJs: true, noLib: true, noResolve: true },
        });
        const ext = TS_RE.exec(importerRel)?.[1] ?? 'ts';
        const sf = proj.createSourceFile(`/__importer__.${ext}`, importerText, { overwrite: true });
        const out = new Set();
        for (const id of sf.getImportDeclarations()) {
            const spec = id.getModuleSpecifierValue();
            if (!spec || !spec.startsWith('.'))
                continue;
            const resolved = ctx.resolveRelImport(importerRel, spec);
            if (resolved !== targetRel)
                continue;
            for (const ni of id.getNamedImports())
                out.add(ni.getName());
        }
        return out;
    }
    catch {
        return null;
    }
}
function lineOf(text, name) {
    const re = new RegExp(`\\bexport\\b[\\s\\S]*?\\b${name}\\b`);
    const m = re.exec(text);
    const idx = m ? m.index : text.indexOf(name);
    if (idx < 0)
        return 1;
    let line = 1;
    for (let i = 0; i < idx; i += 1)
        if (text[i] === '\n')
            line += 1;
    return line;
}
const NOTE = 'a write must not REMOVE an exported name still imported (from this module) by another file in the changed set (breaking public contract); NEW-only vs prior, co-change exonerated';
const publicContractGate = {
    name: 'public-contract',
    kind: 'static',
    appliesTo(rel) {
        return TS_RE.test(rel);
    },
    async run(ctx) {
        const reds = [];
        let anyDecided = false;
        let anyUndecided = false;
        const sources = ctx.changedFiles.filter((f) => TS_RE.test(f));
        for (const rel of sources) {
            const now = ctx.readFile(rel);
            if (now === null)
                continue;
            const prior = ctx.priorOf(rel);
            if (prior === '')
                continue; // brand-new module — no prior surface → no removal claim
            const newSurface = await moduleExportSurface(rel, now);
            const priorSurface = await moduleExportSurface(rel, prior);
            if (newSurface === null || priorSurface === null) {
                anyUndecided = true;
                continue;
            }
            if (newSurface.hasStar || priorSurface.hasStar) {
                anyUndecided = true;
                continue;
            }
            const removed = [...priorSurface.names].filter((n) => !newSurface.names.has(n));
            if (removed.length === 0) {
                anyDecided = true;
                continue;
            }
            for (const importerRel of sources) {
                if (importerRel === rel)
                    continue;
                const importerText = ctx.readFile(importerRel);
                if (importerText === null)
                    continue;
                const imported = await namedImportsFrom(ctx, importerRel, importerText, rel);
                if (imported === null) {
                    anyUndecided = true;
                    continue;
                }
                for (const name of removed) {
                    if (imported.has(name)) {
                        reds.push({
                            file: rel,
                            locus: `L${lineOf(prior, name)}`,
                            fact: `removes exported '${name}' still imported by '${importerRel}' — breaking public contract; re-add the export or co-update the importer in this set`,
                        });
                    }
                }
            }
            anyDecided = true;
        }
        if (reds.length > 0)
            return { gate: this.name, green: false, reds, note: NOTE };
        if (!anyDecided && anyUndecided)
            return { gate: this.name, green: true, reds: [], note: NOTE, unjudged: true };
        return { gate: this.name, green: true, reds: [], note: NOTE };
    },
};
export default publicContractGate;
