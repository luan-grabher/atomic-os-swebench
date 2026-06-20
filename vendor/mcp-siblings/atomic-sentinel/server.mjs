import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import chokidar from "chokidar";

// GAP-04: Dynamic repo root discovery
function findRepoRoot() {
    let dir = process.cwd();
    const { root } = path.parse(dir);
    while (dir !== root) {
        try {
            // Synchronous check is fine at startup
            fsSync.accessSync(path.join(dir, ".git"));
            return dir;
        } catch {
            dir = path.dirname(dir);
        }
    }
    return os.homedir();
}

const REPO_ROOT = process.env.ATOMIC_REPO_ROOT || findRepoRoot();
const ATOMIC_DIR = path.join(REPO_ROOT, ".atomic");
const TASKS_FILE = path.join(ATOMIC_DIR, "swarm-tasks.json");
const LOCKS_DIR = path.join(REPO_ROOT, ".atomic-edit-locks");
const LEDGER_FILE = path.join(ATOMIC_DIR, "sentinel-events-ledger.jsonl");

const alertedTasks = new Set();
const alertedLocks = new Set();

async function logEvent(type, data) {
    const entry = {
        timestamp: new Date().toISOString(),
        type,
        data
    };
    try {
        await fs.mkdir(ATOMIC_DIR, { recursive: true });
        await fs.appendFile(LEDGER_FILE, JSON.stringify(entry) + "\n");
    } catch (e) {
        // Failed to write to ledger, ignore
    }
}

// GAP-03: Auto-heal task creation for failed tasks
async function createAutoHealTask(task) {
    try {
        await fs.mkdir(ATOMIC_DIR, { recursive: true });
        let tasks = [];
        try {
            const raw = await fs.readFile(TASKS_FILE, "utf-8");
            tasks = JSON.parse(raw);
            if (!Array.isArray(tasks)) {
                tasks = tasks.tasks || Object.values(tasks);
            }
        } catch {
            // File doesn't exist or invalid, start fresh
            tasks = [];
        }

        tasks.push({
            id: randomUUID(),
            type: "auto_heal",
            status: "pending",
            payload: task,
            createdAt: new Date().toISOString()
        });

        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
    } catch (e) {
        console.error("Failed to create auto-heal task:", e);
    }
}

async function checkTasks() {
    try {
        const data = await fs.readFile(TASKS_FILE, "utf-8");
        const tasks = JSON.parse(data);
        const taskList = Array.isArray(tasks) ? tasks : (tasks.tasks || Object.values(tasks));

        for (const task of taskList) {
            const taskId = task.id || task.name || JSON.stringify(task);
            if (task.status === "failed" && !alertedTasks.has(taskId)) {
                alertedTasks.add(taskId);
                await logEvent("task_failed", task);
                // GAP-03: Trigger auto-heal for failed tasks
                await createAutoHealTask(task);
            }
        }
    } catch (e) {
        // File might not exist or be invalid JSON, ignore
    }
}

async function checkLocks() {
    try {
        const files = await fs.readdir(LOCKS_DIR);
        for (const file of files) {
            if (!file.endsWith(".json")) continue;

            const filePath = path.join(LOCKS_DIR, file);
            try {
                const data = await fs.readFile(filePath, "utf-8");
                const lock = JSON.parse(data);

                // Assuming lock has expiresAt or similar
                const expiresAt = lock.expiresAt || lock.expiry || lock.validUntil;
                if (expiresAt && Date.now() > expiresAt && !alertedLocks.has(file)) {
                    alertedLocks.add(file);
                    await logEvent("lock_expired", { file, lock });
                }
            } catch (e) {
                // Read/parse error, skip
            }
        }
    } catch (e) {
        // Directory might not exist, ignore
    }
}

let tasksTimeout = null;
function debouncedCheckTasks() {
    if (tasksTimeout) clearTimeout(tasksTimeout);
    tasksTimeout = setTimeout(() => {
        checkTasks().catch(console.error);
    }, 500);
}

let locksTimeout = null;
function debouncedCheckLocks() {
    if (locksTimeout) clearTimeout(locksTimeout);
    locksTimeout = setTimeout(() => {
        checkLocks().catch(console.error);
    }, 500);
}

const tasksWatcher = chokidar.watch(TASKS_FILE, { persistent: true, ignoreInitial: false });
tasksWatcher.on('add', debouncedCheckTasks);
tasksWatcher.on('change', debouncedCheckTasks);

const locksWatcher = chokidar.watch(LOCKS_DIR, { persistent: true, ignoreInitial: false });
locksWatcher.on('add', debouncedCheckLocks);
locksWatcher.on('change', debouncedCheckLocks);
locksWatcher.on('unlink', debouncedCheckLocks);

async function shutdown() {
    console.error("Shutting down atomic-sentinel...");
    try {
        await tasksWatcher.close();
        await locksWatcher.close();
        if (server) await server.close();
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// GAP-12: Migrated to McpServer API
const server = new McpServer({
    name: "atomic-sentinel",
    version: "1.0.0"
});

server.registerTool("sentinel_status", {
    description: "Get the current status of the atomic sentinel and recent events.",
    inputSchema: {}
}, async () => {
    let events = [];
    try {
        const data = await fs.readFile(LEDGER_FILE, "utf-8");
        events = data.trim().split("\n").map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(Boolean);
    } catch (e) {
        // Ledger might not exist yet
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                status: "running",
                alertedTasksCount: alertedTasks.size,
                alertedLocksCount: alertedLocks.size,
                recentEvents: events.slice(-10) // last 10 events
            }, null, 2)
        }]
    };
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

run().catch(console.error);
