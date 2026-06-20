import * as fs from 'node:fs';
import * as path from 'node:path';
const LEAK_PATTERNS = [/^\.smoke-/, /^atomic-type-gate-/, /^atomic-edit\.\d+\.tmp$/, /^\.atomic-build-tmp/];
const gate = {
    name: 'artifact-hygiene',
    kind: 'static',
    appliesTo(_rel) { return true; },
    run(ctx) {
        const reds = [];
        for (const rel of ctx.changedFiles) {
            const absPath = path.join(ctx.repoRoot, rel);
            const dir = path.dirname(absPath);
            if (!fs.existsSync(dir))
                continue;
            try {
                for (const entry of fs.readdirSync(dir)) {
                    for (const pat of LEAK_PATTERNS) {
                        if (pat.test(entry))
                            reds.push({ file: rel, locus: `${dir}/${entry}`, fact: `leaked: ${entry}` });
                    }
                }
            }
            catch {
                return { gate: 'artifact-hygiene', green: false, reds, unjudged: true, unjudgedReason: 'dir unreadable' };
            }
        }
        return reds.length > 0 ? { gate: 'artifact-hygiene', green: false, reds }
            : { gate: 'artifact-hygiene', green: true, reds: [], note: 'zero leaks' };
    },
};
export default gate;
