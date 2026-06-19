# Artifact Evaluation

## Reproducibility

```bash
cd atomic-edit
npm install && npm run build
node src/smoke.mjs          # 47/47 checks
node src/paradigm-verify.mjs # 23/23 green
```

## Formal Proofs

- Z3: `python3 formal/atomic-algebra/confluence_z3.py`
- Lean 4: `lean formal/atomic-algebra/NwayConfluence.lean`

## Self-Host

- `node src/self-host-demo.proof.mjs` — 53,722 LOC, zero broken states

## Multi-Agent

- Certificate: `.atomic/confluence-certificate.json` — 92% confluence, 3 agents, 300 edits

## Corpus

- `.atomic/disproof-corpus.jsonl` — 10,063 records, hash-chain valid
