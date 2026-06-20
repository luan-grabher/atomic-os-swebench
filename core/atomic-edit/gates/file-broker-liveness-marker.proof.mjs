#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonMode = process.argv.includes('--json');
const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(sourceDir, '..', '..');
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const broker = read('scripts/mcp/atomic-edit/atomic-exec-broker.mjs');
const execTools = read('scripts/mcp/atomic-edit/server-tools-exec.ts');
const selfTools = read('scripts/mcp/atomic-edit/server-tools-self.ts');
const proofEnv = read('scripts/mcp/atomic-edit/gates/proof-host-env.mjs');
const launcherImpl = read('scripts/mcp/atomic-edit-mcp-launcher-impl.sh');
const supervisor = read('scripts/mcp/atomic-edit/launcher-supervisor.mjs');
const results = [];
function record(name, ok, detail = {}) { results.push({ name, ok: Boolean(ok), detail }); }

record('file broker publishes broker.json liveness marker before readiness', broker.includes("writeJsonAtomic(path.join(root, 'broker.json')") && broker.includes("protocol: 'atomic-file-broker-v1'") && broker.includes('pid: process.pid') && broker.indexOf("path.join(root, 'broker.json')") < broker.indexOf("ATOMIC_BROKER_READY file://"), { hasBrokerJson: broker.includes("path.join(root, 'broker.json')"), hasProtocol: broker.includes("atomic-file-broker-v1") });
record('atomic_exec accepts file broker endpoints only with live marker', execTools.includes("path.join(dir, 'broker.json')") && execTools.includes("marker.protocol !== 'atomic-file-broker-v1'") && execTools.includes('process.kill(marker.pid, 0)') && execTools.includes("path.join(dir, 'requests')") && execTools.includes("path.join(dir, 'responses')"), { hasMarker: execTools.includes("path.join(dir, 'broker.json')") });
record('self-expansion accepts file broker endpoints only with live marker', selfTools.includes("path.join(dir, 'broker.json')") && selfTools.includes("marker.protocol !== 'atomic-file-broker-v1'") && selfTools.includes('process.kill(marker.pid, 0)'), { hasMarker: selfTools.includes("path.join(dir, 'broker.json')") });
record('host proof env validates explicit and state brokers through marker-aware readiness', proofEnv.includes('const explicitCandidate') && proofEnv.includes('const explicitSocket = brokerEndpointReady(explicitCandidate)') && proofEnv.includes("path.join(dir, 'broker.json')") && proofEnv.includes("marker?.protocol !== 'atomic-file-broker-v1'"), { explicitFiltered: proofEnv.includes('const explicitSocket = brokerEndpointReady(explicitCandidate)') });
record('launcher rejects stale file broker directories in recovery and host preflight', launcherImpl.includes('function fileBrokerMarkerAlive(dir)') && launcherImpl.includes('!fileBrokerMarkerAlive(dir)') && launcherImpl.includes('file broker liveness marker is stale or invalid') && launcherImpl.includes('self-hosted file broker did not publish liveness marker'), { hasRecoveryMarker: launcherImpl.includes('function fileBrokerMarkerAlive(dir)'), hasPreflightMarker: launcherImpl.includes('file broker liveness marker is stale or invalid') });
record('supervisor treats file broker alive only when marker protocol and pid are live', supervisor.includes("path.join(dir, 'broker.json')") && supervisor.includes("marker?.protocol !== 'atomic-file-broker-v1'") && supervisor.includes('process.kill(marker.pid, 0)') && supervisor.includes('missingBrokerSocket80'), { hasMissingSocketGuard: supervisor.includes('missingBrokerSocket80') });

const ok = results.every((entry) => entry.ok);
if (jsonMode || !ok) console.log(JSON.stringify({ ok, results }, null, 2));
process.exit(ok ? 0 : 1);
