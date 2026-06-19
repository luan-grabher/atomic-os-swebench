# atomic-os-swebench

Scaffold único unificado: **DeepSeek V4 Pro (cérebro) + atomic-edit MCP completo (mãos) + agent loop**,
e2e no SWE-bench Verified. Consolida todo o trabalho atomic/kloel/SWE-bench espalhado pela máquina.

- `core/` — NÚCLEO ATIVO (e2e): `agent/` (loop 49/50), `atomic-edit/` (MCP completo, ~124 tools),
  `swebench-funnel/` (A/B ON/OFF), `swebench-cli/` (pipeline de geração), `config/`.
- `vendor/` — PRESERVADO intacto: selfloop, coglang, formal-atomic-algebra, paper, ledgers, laudos, mcp-siblings.
- `data/` — predictions (incl. preds-all 49/50), ids.
- `evidence/` — final-50.json, forensics.
- `core/_union-staging/` — atomic-edit do worktree elevation, pendente de UNIÃO 3-way (WAVE B3).

Procedência: montado da quarentena imutável `~/atomic-snapshot-20260619-193711/` (MANIFEST.sha256).
Status: estrutura montada; FALTA união 3-way do atomic-edit (B3), wiring (C), verificação e2e + A/B (D).
