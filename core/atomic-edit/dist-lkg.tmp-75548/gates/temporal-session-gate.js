import * as ts from 'typescript';
const SOURCE_RE = /\.[cm]?[jt]sx?$/;
function scriptKindFor(rel) {
    if (/\.tsx$/i.test(rel))
        return ts.ScriptKind.TSX;
    if (/\.jsx$/i.test(rel))
        return ts.ScriptKind.JSX;
    if (/\.json$/i.test(rel))
        return ts.ScriptKind.JSON;
    return ts.ScriptKind.TS;
}
function parseSource(rel, content) {
    return ts.createSourceFile(rel, content, ts.ScriptTarget.Latest, true, scriptKindFor(rel));
}
function bindingKey(binding) {
    return `${binding.local}\u0000${binding.moduleSpecifier}`;
}
function lineCol(sf, node) {
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return { line: pos.line + 1, col: pos.character + 1 };
}
function importBindings(rel, content) {
    if (!SOURCE_RE.test(rel))
        return [];
    const sf = parseSource(rel, content);
    const out = [];
    const add = (name, moduleSpecifier) => {
        const loc = lineCol(sf, name);
        out.push({ local: name.text, moduleSpecifier, line: loc.line, col: loc.col });
    };
    for (const stmt of sf.statements) {
        if (!ts.isImportDeclaration(stmt))
            continue;
        if (!ts.isStringLiteral(stmt.moduleSpecifier))
            continue;
        const moduleSpecifier = stmt.moduleSpecifier.text;
        const clause = stmt.importClause;
        if (!clause)
            continue;
        if (clause.name)
            add(clause.name, moduleSpecifier);
        const named = clause.namedBindings;
        if (!named)
            continue;
        if (ts.isNamespaceImport(named)) {
            add(named.name, moduleSpecifier);
            continue;
        }
        for (const element of named.elements)
            add(element.name, moduleSpecifier);
    }
    return out;
}
function importBindingMap(rel, content) {
    const map = new Map();
    if (typeof content !== 'string')
        return map;
    for (const binding of importBindings(rel, content))
        map.set(bindingKey(binding), binding);
    return map;
}
function identifierUsedOutsideImports(rel, content, name) {
    if (!SOURCE_RE.test(rel))
        return false;
    const sf = parseSource(rel, content);
    let used = false;
    const visit = (node) => {
        if (used)
            return;
        if (ts.isImportDeclaration(node))
            return;
        if (ts.isIdentifier(node) && node.text === name) {
            used = true;
            return;
        }
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(sf, visit);
    return used;
}
function materializeTimeline(snapshots) {
    const state = new Map();
    const out = [];
    for (const snapshot of snapshots) {
        for (const [file, content] of Object.entries(snapshot.files))
            state.set(file.replaceAll('\\', '/'), content);
        out.push({ snapshot, state: new Map(state) });
    }
    return out;
}
export function judgeTemporalSession(snapshots, options = {}) {
    const gate = 'temporal-session';
    const followingSnapshots = Math.max(1, Math.floor(options.followingSnapshots ?? 5));
    const note = `newly-added imports must be referenced within ${followingSnapshots} following session snapshot(s)`;
    const timeline = materializeTimeline(snapshots);
    const reds = [];
    for (let i = 1; i < timeline.length; i += 1) {
        const current = timeline[i];
        const previous = timeline[i - 1];
        if (!current || !previous)
            continue;
        for (const file of Object.keys(current.snapshot.files).map((f) => f.replaceAll('\\', '/'))) {
            const afterContent = current.state.get(file);
            if (typeof afterContent !== 'string' || !SOURCE_RE.test(file))
                continue;
            const beforeContent = previous.state.get(file);
            const beforeImports = importBindingMap(file, beforeContent);
            const afterImports = importBindingMap(file, afterContent);
            for (const [key, binding] of afterImports) {
                if (beforeImports.has(key))
                    continue;
                if (identifierUsedOutsideImports(file, afterContent, binding.local))
                    continue;
                const futureIndex = i + followingSnapshots;
                if (futureIndex >= timeline.length)
                    continue;
                let stillPresent = true;
                let usedLater = false;
                for (let j = i + 1; j <= futureIndex; j += 1) {
                    const futureContent = timeline[j]?.state.get(file);
                    if (typeof futureContent !== 'string') {
                        stillPresent = false;
                        break;
                    }
                    if (!importBindingMap(file, futureContent).has(key)) {
                        stillPresent = false;
                        break;
                    }
                    if (identifierUsedOutsideImports(file, futureContent, binding.local)) {
                        usedLater = true;
                        break;
                    }
                }
                if (!stillPresent || usedLater)
                    continue;
                const observedThrough = timeline[futureIndex]?.snapshot.name ?? `snapshot-${futureIndex}`;
                reds.push({
                    gate,
                    file,
                    locus: `L${binding.line}:${binding.col}`,
                    fact: `import binding '${binding.local}' with module specifier '${binding.moduleSpecifier}' was added at ${current.snapshot.name} ` +
                        `and never referenced through ${observedThrough}`,
                    importName: binding.local,
                    moduleSpecifier: binding.moduleSpecifier,
                    introducedAt: current.snapshot.name,
                    observedThrough,
                });
            }
        }
    }
    return { gate, green: reds.length === 0, reds, note, notApplicable: reds.length === 0 };
}
