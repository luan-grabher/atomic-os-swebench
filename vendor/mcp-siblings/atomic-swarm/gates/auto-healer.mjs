import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { randomUUID, createHash } from 'crypto';

const REPO_ROOT = process.env.ATOMIC_SWARM_REPO_ROOT || process.cwd();

/**
 * Pillar 6: Auto-Healing Gates
 * Simulates an auto-healer that receives a failed AST or lint error and
 * generates an auto-healing patch proposition for atomic-edit.
 */
export function atomic_repair_scope(errorReport) {
  console.error(`[Auto-Healer] Scheduling auto_heal task for error report: ${errorReport.type}`);
  
  const tasksPath = path.join(REPO_ROOT, '.atomic', 'swarm-tasks.json');
  const ledgerPath = path.join(REPO_ROOT, '.atomic', 'swarm-tasks-ledger.jsonl');
  
  const atomicDir = path.dirname(tasksPath);
  if (!fs.existsSync(atomicDir)) {
    fs.mkdirSync(atomicDir, { recursive: true });
  }

  let tasks = [];
  if (fs.existsSync(tasksPath)) {
    try {
      const content = fs.readFileSync(tasksPath, 'utf8');
      tasks = JSON.parse(content);
      if (!Array.isArray(tasks)) tasks = [];
    } catch (e) {
      console.error('[Auto-Healer] Failed to read tasks ledger, creating new array:', e);
      tasks = [];
    }
  }

  const taskId = randomUUID();
  const newTask = {
    id: taskId,
    type: 'auto_heal',
    status: 'pending',
    payload: errorReport,
    createdAt: new Date().toISOString()
  };

  // GAP-14: Add integrity hash before writing
  newTask.hash = createHash('sha256').update(JSON.stringify(newTask)).digest('hex');

  tasks.push(newTask);
  fs.writeFileSync(tasksPath, JSON.stringify(tasks, null, 2), 'utf8');

  // GAP-08: Append audit ledger entry
  const ledgerEntry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'auto_heal_scheduled',
    taskId,
    payload: errorReport
  });
  fs.appendFileSync(ledgerPath, ledgerEntry + '\n', 'utf8');

  console.error(`[Auto-Healer] Scheduled auto_heal task (ID: ${taskId}) in ${tasksPath}`);

  return {
    status: 'task_scheduled',
    taskId: taskId,
    originalError: errorReport,
  };
}

// Quick test at the bottom
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error('Running Auto-Healer Tests...');
  
  const mockLintError = {
    type: 'lint_error',
    rule: 'no-unused-vars',
    target: 'unusedVar',
    line: 42,
  };

  const mockAstError = {
    type: 'ast_syntax_error',
    message: 'Missing semicolon',
    line: 15,
    column: 30,
  };

  console.log('\n--- Test 1: Lint Error ---');
  const result1 = atomic_repair_scope(mockLintError);
  console.log(JSON.stringify(result1, null, 2));

  console.log('\n--- Test 2: AST Error ---');
  const result2 = atomic_repair_scope(mockAstError);
  console.log(JSON.stringify(result2, null, 2));
}
