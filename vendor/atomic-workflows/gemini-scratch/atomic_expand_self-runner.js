const cp = require('child_process');
const server = cp.spawn('node', ['dist/server.js'], {stdio: ['pipe', 'pipe', 'pipe']});
server.stdout.on('data', d => {
  const str = d.toString();
  console.log(str);
  if (str.includes('"result":')) {
    server.kill();
    process.exit(0);
  }
});
server.stderr.on('data', d => console.error(d.toString()));
server.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'atomic_expand_self',
    arguments: {
      files: [{
        op: 'replace_text',
        file: 'scripts/mcp/atomic-edit/README.md',
        oldText: '- **166 proof entrypoints** and **223 total gate files** under `gates/` covering exec sandbox, atomic writes, bypass honesty, connection byte-floor, snapshot ceilings, formal model lifts, public package tests, multi-language supply-chain resolution, doc honesty, and more.',
        newText: '- **167 proof entrypoints** and **223 total gate files** under `gates/` covering exec sandbox, atomic writes, bypass honesty, connection byte-floor, snapshot ceilings, formal model lifts, public package tests, multi-language supply-chain resolution, doc honesty, and more.',
        proofOfIncorrectness: 'The number of proof files on the filesystem is 167, making the README count of 166 factually incorrect.'
      }],
      proofCommands: ['node gates/doc-honesty.proof.mjs --json'],
      intent: 'fix doc honesty gap by syncing proof counts'
    }
  }
}) + '\n');
