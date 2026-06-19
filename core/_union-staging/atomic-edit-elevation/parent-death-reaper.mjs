/**
 * parent-death-reaper.mjs — the resource-lifetime invariant's enforcement primitive.
 *
 * THE LEAK IT CLOSES (PARADIGM increment L02 / L21):
 *   A long-lived, socket-/poll-driven child (the atomic-exec broker, the file broker)
 *   reads no stdin, so a closed pipe never signals it. On an ABNORMAL parent death
 *   (SIGKILL, crash, a timeout-killed gate run, a power loss) no SIGTERM is delivered:
 *   the child is reparented to launchd/init (ppid 1) and keeps listening FOREVER. That
 *   orphaning — not the language-server, which self-exits on stdin-EOF — was the dominant
 *   source of the ~242 leaked broker/server processes (~704 MB) that accumulated until the
 *   gate suite false-timed-out. 134 STATIC proofs stayed green through all of it because
 *   none observed RUNTIME process lifetime. This is that missing observer, as ONE module.
 *
 * WHY A POLL AND NOT process.ppid:
 *   Node captures process.ppid ONCE at startup and does NOT update it on reparent, so we
 *   cannot watch it flip to 1. Instead we record the owning parent's pid at startup and
 *   poll its LIVENESS with signal 0:
 *     - throws ESRCH  -> no such process -> owner gone -> we are orphaned -> reap.
 *     - throws EPERM  -> pid still exists (owner alive, just not signalable) -> keep serving.
 *     - no throw      -> owner alive -> keep serving.
 *
 * SINGLE SOURCE OF TRUTH: atomic-exec-broker.mjs and resource-lifetime.proof.mjs BOTH call
 * this. The proof therefore exercises the REAL reaper code (not a re-implementation), so its
 * RED-pre / GREEN-post verdict is about production behaviour, not a model of it.
 */

/**
 * Decide, given a parent pid and a kill(pid,0) probe, whether the owner is still alive.
 * Pure + exported so a proof can unit-check the ESRCH/EPERM branch logic with no processes.
 * @param {(pid:number)=>void} killProbe  throws on dead/unsignalable pid (process.kill semantics)
 * @param {number} parentPid
 * @returns {boolean} true = owner alive (keep serving), false = orphaned (reap)
 */
export function ownerAlive(killProbe, parentPid) {
  try {
    killProbe(parentPid);
    return true;
  } catch (err) {
    // EPERM = pid exists but not signalable by us → still alive. Anything else (ESRCH) → gone.
    return Boolean(err && err.code === 'EPERM');
  }
}

/**
 * Install the parent-death reaper. Returns the interval timer (unref'd, so it never keeps
 * the event loop alive on its own) or null when there is no real owner to watch (ppid<=1,
 * i.e. already a top-level/standalone process — nothing to be orphaned FROM).
 * @param {{ parentPid?: number, intervalMs?: number, label?: string, onOrphaned: () => void,
 *           killProbe?: (pid:number)=>void, log?: (msg:string)=>void }} opts
 */
export function installParentDeathReaper(opts) {
  const {
    parentPid = process.ppid,
    intervalMs = 2000,
    label = 'process',
    onOrphaned,
    killProbe = (pid) => process.kill(pid, 0),
    log = (msg) => { try { process.stderr.write(msg); } catch { /* best-effort */ } },
  } = opts;
  if (typeof onOrphaned !== 'function') throw new Error('installParentDeathReaper: onOrphaned required');
  if (!(parentPid > 1)) return null;
  const timer = setInterval(() => {
    if (!ownerAlive(killProbe, parentPid)) {
      log(`[${label}] owning parent ${parentPid} gone; reaping orphaned ${label}\n`);
      onOrphaned();
    }
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
