const TS_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
/**
 * ts-morph module-export enumeration, scoped to ONE resolved target module's bytes.
 * Returns { names, hasStar } where:
 *   - names = the directly-enumerable export NAME set (value + type + default).
 *   - hasStar = the target itself contains a namespace re-export (`export *`), so
 *     names is INCOMPLETE (a transitive export is not enumerable from these bytes).
 * Returns null when ts-morph is unavailable or the target cannot be parsed →
 * caller treats every specifier against this target as undecidable (unjudged).
 *
 * This is the same in-process ts-morph machinery binding-gate.ts uses (noLib /
 * noResolve in-memory project): we ask ts-morph "what does this module export",
 * which is exactly the LSP fact, without a language server.
 */
async function targetExportNames(rel, text) {
    let tsMorph;
    try {
        tsMorph = await import('ts-morph');
    }
    catch {
        return null; // ts-morph not installed → undecidable for this target
    }
    const { Project, SyntaxKind } = tsMorph;
    try {
        const proj = new Project({
            useInMemoryFileSystem: true,
            skipAddingFilesFromTsConfig: true,
            // noLib/noResolve: we only need THIS module's own export surface, not the
            // whole lib graph; matches binding-gate's project shape exactly.
            compilerOptions: { allowJs: true, noLib: true, noResolve: true },
        });
        const ext = TS_RE.exec(rel)?.[1] ?? 'ts';
        const sf = proj.createSourceFile(`/__reexport_target__.${ext}`, text, { overwrite: true });
        const names = new Set();
        for (const s of sf.getExportSymbols())
            names.add(s.getName());
        for (const k of sf.getExportedDeclarations().keys())
            names.add(k);
        // A target with its OWN namespace re-export has an export surface that is NOT
        // fully enumerable from these bytes (the transitive star's names live in an
        // unloaded module). Record that so the caller stays honest on a miss.
        const hasStar = sf
            .getDescendantsOfKind(SyntaxKind.ExportDeclaration)
            .some((e) => e.isNamespaceExport());
        return { names, hasStar };
    }
    catch {
        return null; // could not parse the target → undecidable
    }
}
/**
 * Extract the named re-export specifiers of ONE source file via ts-morph, resolving
 * each target through the shared ctx.resolveRelImport and checking each source name
 * against the target's enumerated exports. Returns:
 *   - reds: the dangling re-export specifiers DECIDED in this file.
 *   - undecided: true if any specifier could not be decided (ts-morph/target
 *     unreadable, or a miss against a star-bearing target) — folds into unjudged.
 *   - decided: true if at least one specifier was conclusively judged.
 * Returns null when ts-morph is unavailable or the re-exporting file cannot be
 * parsed → the whole file is undecidable (unjudged), never red-by-guess.
 */
async function danglingReexportsOf(ctx, fromRel, text) {
    let tsMorph;
    try {
        tsMorph = await import('ts-morph');
    }
    catch {
        return null;
    }
    const { Project, SyntaxKind } = tsMorph;
    let sf;
    try {
        const proj = new Project({
            useInMemoryFileSystem: true,
            skipAddingFilesFromTsConfig: true,
            compilerOptions: { allowJs: true, noLib: true, noResolve: true },
        });
        const ext = TS_RE.exec(fromRel)?.[1] ?? 'ts';
        sf = proj.createSourceFile(`/__reexporter__.${ext}`, text, { overwrite: true });
    }
    catch {
        return null;
    }
    const reds = [];
    let decided = false;
    let undecided = false;
    // Cache target enumeration per resolved target so N specifiers from one barrel
    // re-parse the target once.
    const targetCache = new Map();
    for (const ed of sf.getDescendantsOfKind(SyntaxKind.ExportDeclaration)) {
        const spec = ed.getModuleSpecifierValue();
        if (!spec)
            continue; // `export { x }` (local re-export, no `from`) — binding/no module half here
        // `export * from './m'` — namespace re-export: the re-exported set is the
        // target's entire dynamic surface (and may be transitively starred). Not a
        // decidable single-name fact → honest unjudged contribution, never red.
        if (ed.isNamespaceExport()) {
            undecided = true;
            continue;
        }
        const named = ed.getNamedExports();
        if (named.length === 0)
            continue; // nothing named to judge on this declaration
        // Resolve the target through the SHARED resolver — same meaning of "resolves"
        // as connection-gate / supply-chain. null splits two honest ways:
        //   - a BARE specifier (`from 'pkg'`, no leading '.') is a different fact
        //     entirely (supply-chain's) — there is no per-symbol re-export claim to
        //     judge against a package barrel here, so skip cleanly (no undecided flag).
        //   - a RELATIVE specifier (`./x`) that does NOT resolve to a real file: the
        //     module half dangles (connection-gate reds it), but WE could not reach the
        //     target to enumerate its exports → this name is UNDECIDABLE for us, so we
        //     record undecided (→ unjudged), never green-by-assumption, never red-by-guess.
        const target = ctx.resolveRelImport(fromRel, spec);
        if (target === null) {
            if (spec.startsWith('.'))
                undecided = true; // relative-but-unresolvable → undecidable
            continue; // bare specifier → supply-chain's fact, nothing to judge here
        }
        let enumerated = targetCache.get(target);
        if (enumerated === undefined) {
            const targetText = ctx.readFile(target);
            enumerated = targetText === null ? null : await targetExportNames(target, targetText);
            targetCache.set(target, enumerated);
        }
        if (enumerated === null) {
            undecided = true; // target unreadable / unparseable → undecidable for these names
            continue;
        }
        for (const ne of named) {
            // getName() is the SOURCE name the target must export: `Foo` for `Foo`,
            // `Foo` for `Foo as Bar`, and `default` for `default as D`.
            const sourceName = ne.getName();
            const start = ne.getStart();
            const lc = sf.getLineAndColumnAtPos(start);
            if (enumerated.names.has(sourceName)) {
                decided = true;
                continue; // re-exported name is a real export of the target — green
            }
            // Not found directly. If the target carries its OWN `export *`, the name may
            // arrive through that transitive star, which we cannot enumerate from one
            // module's bytes → UNJUDGED, never red.
            if (enumerated.hasStar) {
                undecided = true;
                continue;
            }
            decided = true;
            reds.push({ name: sourceName, target, line: lc.line, col: lc.column });
        }
    }
    return { reds, decided, undecided };
}
const NOTE = 'every NEW named re-export `export { name } from "./m"` resolves to a real export of "./m" (NEW-only)';
const reexportSymbolGate = {
    name: 'reexport-symbol',
    kind: 'static',
    appliesTo(rel) {
        return TS_RE.test(rel);
    },
    async run(ctx) {
        const reds = [];
        let anyDecided = false;
        let anyUndecided = false;
        for (const rel of ctx.changedFiles) {
            if (!this.appliesTo(rel))
                continue;
            const now = ctx.readFile(rel);
            if (now === null)
                continue;
            const nowRes = await danglingReexportsOf(ctx, rel, now);
            if (nowRes === null) {
                anyUndecided = true; // ts-morph unavailable / unparseable re-exporter → honest
                continue;
            }
            if (nowRes.decided)
                anyDecided = true;
            if (nowRes.undecided)
                anyUndecided = true;
            // NEW-only delta: subtract the specifiers ALREADY dangling in the prior bytes.
            // ctx.priorOf = prior disk bytes (WRITE) or '' (LENS → judge absolutely).
            const beforeRaw = ctx.priorOf(rel);
            let priorKeys = new Set();
            if (beforeRaw !== '') {
                const beforeRes = await danglingReexportsOf(ctx, rel, beforeRaw);
                if (beforeRes !== null) {
                    priorKeys = new Set(beforeRes.reds.map((r) => `${r.name} ${r.target}`));
                }
            }
            for (const d of nowRes.reds) {
                if (priorKeys.has(`${d.name} ${d.target}`))
                    continue; // already dangling before → not this write's claim
                reds.push({
                    file: rel,
                    locus: `L${d.line}:${d.col}`,
                    fact: `re-exports '${d.name}' not exported by '${d.target}' (dangling named re-export)`,
                });
            }
        }
        if (reds.length > 0) {
            return { gate: this.name, green: false, reds, note: NOTE };
        }
        // No reds. A real green requires that we decided at least one specifier. If the
        // only thing we saw was undecidable (ts-morph absent, or solely star/unresolved
        // re-exports), be honest: unjudged, not green-by-assumption.
        if (!anyDecided && anyUndecided) {
            return { gate: this.name, green: true, reds: [], note: NOTE, unjudged: true };
        }
        return { gate: this.name, green: true, reds: [], note: NOTE };
    },
};
export default reexportSymbolGate;
