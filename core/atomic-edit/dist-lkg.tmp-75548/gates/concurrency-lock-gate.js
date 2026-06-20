import * as fs from 'node:fs';
import * as path from 'node:path';
const gate = {
    name: 'concurrency-lock',
    kind: 'static',
    appliesTo(_rel) { return true; },
    run(ctx) {
        const reds = [];
        const locksPath = path.join(ctx.repoRoot, '.atomic-edit-locks');
        if (!fs.existsSync(locksPath))
            return { gate: 'concurrency-lock', green: true, reds: [], note: 'no locks dir' };
        const rel = ctx.changedFiles?.values().next().value ?? '.';
        try {
            const now = Date.now();
            for (const entry of fs.readdirSync(locksPath)) {
                const lockPath = path.join(locksPath, entry);
                try {
                    if (fs.statSync(lockPath).isDirectory()) {
                        const lf = path.join(lockPath, 'lock.json');
                        if (fs.existsSync(lf)) {
                            const d = JSON.parse(fs.readFileSync(lf, 'utf8'));
                            if (d.expiresAt && d.expiresAt < now) {
                                try {
                                    fs.rmSync(lockPath, { recursive: true });
                                }
                                catch { }
                                reds.push({ file: rel, locus: entry, fact: 'stale lock cleaned' });
                            }
                        }
                    }
                }
                catch {
                    try {
                        fs.rmSync(lockPath, { recursive: true });
                    }
                    catch { }
                }
            }
        }
        catch {
            return { gate: 'concurrency-lock', green: false, reds, unjudged: true, unjudgedReason: 'scan failed' };
        }
        return reds.length > 0 ? { gate: 'concurrency-lock', green: false, reds }
            : { gate: 'concurrency-lock', green: true, reds: [], note: 'all locks valid' };
    },
};
export default gate;
