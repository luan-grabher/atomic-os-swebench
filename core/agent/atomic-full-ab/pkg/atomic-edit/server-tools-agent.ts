import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "node:child_process";
import { z } from "zod/v4";
import { REPO_ROOT } from "./guard.js";
import { ok, fail } from "./server-helpers-result.js";
import { atomicRootFromModule, callFreshAtomicTool } from "./server-helpers-hot-reload.js";
import {
  createSession, recordEntry, recordProposal, advancePhase, nextStep,
  incrementAttempt, accept, requestRevision, persistTrajectory,
  listSessions, loadSession,
  type AgentSession, type AgentStep, type AgentProposal, type AgentDecision, type AgentObservation,
} from "./agent-loop.js";

const sessions = new Map<string, AgentSession>();

/** Read the real ok/false + text out of a dispatched tool's MCP envelope (or our single-call shape). */
function freshResultOk(res: unknown): { ok: boolean; text: string } {
  const env = res as { content?: Array<{ text?: string }>; isError?: boolean };
  const text = Array.isArray(env?.content)
    ? env.content.map((c) => c?.text ?? '').join('\n')
    : typeof res === 'string' ? res : JSON.stringify(res);
  let good = env?.isError !== true;
  try { const j = JSON.parse(text); if (j && typeof j.ok === 'boolean') good = good && j.ok; } catch { /* text is not json */ }
  return { ok: good, text: text.slice(0, 1500) };
}

/** Dispatch the proposal's real atomic tool through the real machinery (fresh runtime). This is what
 *  makes validate/commit ACTUAL gate runs / writes instead of bookkeeping that always says "accepted". */
async function dispatchProposal(tool: string, args: Record<string, unknown>, extra: Record<string, unknown>): Promise<{ ok: boolean; text: string }> {
  try {
    const res = await callFreshAtomicTool(atomicRootFromModule(), process.env, tool, { ...args, ...extra });
    return freshResultOk(res);
  } catch (e) {
    return { ok: false, text: e instanceof Error ? e.message : String(e) };
  }
}

function getSession(id: string): AgentSession {
  const cached = sessions.get(id);
  if (cached) return cached;
  const loaded = loadSession(REPO_ROOT, id);
  if (!loaded) throw new Error("No active session: " + JSON.stringify(id));
  sessions.set(id, loaded);
  return loaded;
}

export function registerAgentTools(server: McpServer): void {
  server.registerTool('atomic_agent_plan', {
    title: 'Create an agent session',
    description: 'Start a governed agent session: Use this atomic planning/progress receipt instead of native todowrite or other non-atomic planning tools; returns sessionId for subsequent tools.',
    inputSchema: {
      issue: z.string().describe("Issue or task."),
      steps: z.array(z.object({step:z.number().int().min(1),detail:z.string().describe("Human-readable description of what this step does"),expectedOutcome:z.string(),affectedFiles:z.array(z.string()).optional(),dependsOn:z.number().int().min(0).optional()})),
    },
  }, async (a) => {
    try {
      // Wire field is `detail` (a property literally named `description` collides
      // with JSON Schema's reserved `description` annotation key — strict consumers
      // like the Gemini API drop it from `properties` while keeping it in `required`,
      // producing an invalid schema. Map it back to the internal `description`,
      // still accepting a legacy `description` field for backward compatibility.
      const steps: AgentStep[] = a.steps.map((st) => ({
        step: st.step,
        description: st.detail ?? (st as { description?: string }).description ?? '',
        expectedOutcome: st.expectedOutcome,
        affectedFiles: st.affectedFiles,
        dependsOn: st.dependsOn,
      }));
      const s = createSession(a.issue, steps);
      recordEntry(s, s.plan);
      advancePhase(s);
      sessions.set(s.sessionId, s);
      persistTrajectory(REPO_ROOT, s);
      return ok({
        ok: true,
        sessionId: s.sessionId,
        planId: s.plan.planId,
        phase: s.phase,
        currentStep: s.currentStep,
        totalSteps: s.plan.steps.length,
        complexity: s.plan.complexity,
        fastPathPolicy: {
          read: 'batch known paths/symbols before serial reads',
          edit: 'prefer atomic_converge or atomic_batch_replace_text for clustered same-intent edits',
        },
      });
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_step', {
    title: 'Record observation',
    description: 'Record investigation findings. Advance to propose if ready.',
    inputSchema: {
      sessionId: z.string(),
      tool: z.string().describe("Read tool used."),
      findings: z.array(z.string()),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(s.phase!=="investigate")throw new Error("Phase is "+s.phase); const obs:AgentObservation={step:s.currentStep,tool:a.tool,findings:a.findings,at:Date.now()}; recordEntry(s,obs); advancePhase(s); persistTrajectory(REPO_ROOT,s); return ok({ok:true,sessionId:s.sessionId,phase:s.phase,step:s.currentStep});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_propose', {
    title: 'Propose atomic edit',
    description: 'Submit a candidate edit. Preview only, not yet written.',
    inputSchema: {
      sessionId: z.string(),
      tool: z.string(),
      arguments: z.record(z.string(),z.unknown()),
      summary: z.string(),
      modifiedFiles: z.array(z.string()),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(s.phase!=="propose")throw new Error("Phase is "+s.phase); const p:AgentProposal={step:s.currentStep,tool:a.tool,arguments:a.arguments as Record<string,unknown>,summary:a.summary,modifiedFiles:a.modifiedFiles}; recordEntry(s,p); recordProposal(s,p); persistTrajectory(REPO_ROOT,s); return ok({ok:true,sessionId:s.sessionId,step:s.currentStep});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_validate', {
    title: 'Run gates',
    description: 'Validate the current proposal through atomic gates.',
    inputSchema: {
      sessionId: z.string(),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(s.phase!=="propose")throw new Error("Validate after propose"); const ps=Array.from(s.proposals.values()).filter(function(p:AgentProposal){return p.step===s.currentStep}); if(!ps.length)throw new Error("No proposals");
      // REAL gate run: dispatch the proposal's tool in PREVIEW through the actual atomic machinery.
      // A refused/red proposal must NOT advance and must NOT be recorded "accepted" (the prior
      // hardcoded "Validated." was a rubber-stamp facade contradicting "Validate through atomic gates").
      const prop=ps[ps.length-1]; const vr=await dispatchProposal(prop.tool, prop.arguments, { preview:true });
      if(!vr.ok){ const d:AgentDecision={verdict:"needs_revision",reason:"Gate validation FAILED.",detail:vr.text,evidence:{}}; recordEntry(s,d); persistTrajectory(REPO_ROOT,s); return ok({ok:false,sessionId:s.sessionId,phase:s.phase,verdict:"needs_revision",validation:vr.text}); }
      advancePhase(s); const d:AgentDecision={verdict:"accepted",reason:"Validated through atomic gates.",detail:"Tool: "+prop.tool,evidence:{validation:{language:"typescript",before:0,after:0}}}; recordEntry(s,d); persistTrajectory(REPO_ROOT,s); return ok({ok:true,sessionId:s.sessionId,phase:s.phase,verdict:"accepted"});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_commit', {
    title: 'Execute edit',
    description: 'Apply the validated proposal via atomic write with receipt.',
    inputSchema: {
      sessionId: z.string(),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(s.phase!=="validate")throw new Error("Commit after validate"); const ps=Array.from(s.proposals.values()).filter(function(p:AgentProposal){return p.step===s.currentStep}); if(!ps.length)throw new Error("No validated proposals");
      // REAL write: dispatch the proposal's tool for real (no preview) through the atomic firewall.
      // The prior handler recorded "Committed. Receipt in .atomic/traces/." WITHOUT ever writing —
      // a facade. Now a failed write surfaces and does NOT advance.
      const prop=ps[ps.length-1]; const cr=await dispatchProposal(prop.tool, prop.arguments, { preview:false });
      if(!cr.ok){ const d:AgentDecision={verdict:"needs_revision",reason:"Commit (atomic write) FAILED.",detail:cr.text,evidence:{}}; recordEntry(s,d); persistTrajectory(REPO_ROOT,s); return ok({ok:false,sessionId:s.sessionId,phase:s.phase,error:cr.text}); }
      advancePhase(s); const d:AgentDecision={verdict:"accepted",reason:"Committed via atomic write.",detail:cr.text,evidence:{}}; recordEntry(s,d); persistTrajectory(REPO_ROOT,s); return ok({ok:true,sessionId:s.sessionId,phase:s.phase,step:s.currentStep,receipt:cr.text});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_verify', {
    title: 'Run verification',
    description: 'Typecheck, lint, or test the committed state.',
    inputSchema: {
      sessionId: z.string(),
      verifyType: z.enum(["typecheck","lint","test"]),
      command: z.string().optional(),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(s.phase!=="commit")throw new Error("Verify after commit"); const dm:Record<string,string>={typecheck:"npx tsc --noEmit",lint:"npx eslint .",test:"npm test"}; const c=a.command||dm[a.verifyType];
      // REALLY execute the verification command and report the REAL result. The prior handler built the
      // command string then recorded "Verified" WITHOUT running it — a RED test was reported accepted.
      let vok=true, vout="";
      try { vout=execSync(c,{cwd:REPO_ROOT,encoding:"utf8",timeout:300000,stdio:["ignore","pipe","pipe"]}).slice(-1500); }
      catch(e){ vok=false; const ee=e as {stdout?:string;stderr?:string;message?:string}; vout=((ee.stdout||"")+(ee.stderr||"")+(ee.message||"")).slice(-1500); }
      advancePhase(s); const d:AgentDecision={verdict:vok?"accepted":"needs_revision",reason:(vok?"Verified (passed): ":"Verification FAILED: ")+a.verifyType,detail:"Command: "+c,evidence:{testResults:vout}}; recordEntry(s,d); persistTrajectory(REPO_ROOT,s); return ok({ok:vok,sessionId:s.sessionId,phase:s.phase,verifyType:a.verifyType,command:c,passed:vok,output:vout});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_decide', {
    title: 'Accept or request revision',
    description: 'Final decision on the current step.',
    inputSchema: {
      sessionId: z.string(),
      verdict: z.enum(["accepted","needs_revision"]),
      reason: z.string(),
      detail: z.string().optional(),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); if(a.verdict==="accepted"){const d=accept(s,{},a.detail||"Done.");const n=nextStep(s);recordEntry(s,d);persistTrajectory(REPO_ROOT,s);if(n===null)return ok({ok:true,sessionId:s.sessionId,completed:true});return ok({ok:true,sessionId:s.sessionId,phase:s.phase,nextStep:n})}else{const d=requestRevision(s,a.reason,a.detail||"Revise.");if(!incrementAttempt(s))return ok({ok:true,sessionId:s.sessionId,exhausted:true});s.phase="investigate";recordEntry(s,d);persistTrajectory(REPO_ROOT,s);return ok({ok:true,sessionId:s.sessionId,phase:s.phase,attempt:s.attemptCount,maxAttempts:s.maxAttempts})}
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_status', {
    title: 'Show session state',
    description: 'Display current phase, step, and trajectory length.',
    inputSchema: {
      sessionId: z.string(),
    },
  }, async (a) => {
    try {
      const s=getSession(a.sessionId); return ok({ok:true,sessionId:s.sessionId,planId:s.plan.planId,phase:s.phase,currentStep:s.currentStep,totalSteps:s.plan.steps.length,attemptCount:s.attemptCount,maxAttempts:s.maxAttempts,trajectoryLength:s.trajectory.length});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

  server.registerTool('atomic_agent_sessions', {
    title: 'List sessions',
    description: 'List all agent sessions in .atomic/agent-sessions/.',
    inputSchema: {
    },
  }, async (a) => {
    try {
      const all=listSessions(REPO_ROOT); return ok({ok:true,sessions:all,count:all.length});
    } catch (e) { return fail(e instanceof Error ? e.message : String(e)); }
  });

}