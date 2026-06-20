import * as cp from 'node:child_process';
const gate = {
    name: 'resource-lifetime',
    kind: 'dynamic',
    appliesTo(_rel) { return true; },
    run(ctx) {
        const reds = [];
        try {
            const pid = process.env.ATOMIC_BROKER_PID ? parseInt(process.env.ATOMIC_BROKER_PID) : process.ppid;
            const psResult = cp.execSync(`ps -o pid,ppid,comm -p $(pgrep -P ${pid} 2>/dev/null || echo 0) 2>/dev/null || echo ""`, { encoding: 'utf8', timeout: 5000 });
            for (const line of psResult.trim().split('\n').slice(1)) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3 && parts[1] === '1') {
                    const rel = ctx.changedFiles?.values().next().value ?? '.';
                    reds.push({ file: rel, locus: `pid=${parts[0]}`, fact: `orphaned: ${parts.slice(2).join(' ')}` });
                }
            }
        }
        catch (err) {
            return { gate: 'resource-lifetime', green: false, reds, unjudged: true,
                unjudgedReason: String(err instanceof Error ? err.message : err) };
        }
        if (reds.length > 0)
            return { gate: 'resource-lifetime', green: false, reds };
        return { gate: 'resource-lifetime', green: true, reds: [], note: 'zero orphans' };
    },
};
export default gate;
