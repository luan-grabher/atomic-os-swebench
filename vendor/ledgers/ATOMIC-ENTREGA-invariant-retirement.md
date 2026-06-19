# Entrega — Aposentadoria Auditada de Invariante de Segurança (GC da catraca)

*Construído, validado, provado e promovido ao core do atomic via `atomic_expand_self` (lattice verde). Estado real, no Mac, full-strength.*

## O problema (achado da investigação)

A catraca de monotonicidade de segurança (`security-invariants.mjs`) é mão-única por design: contagens só sobem, ids de fixture só acumulam. Isso é correto contra enfraquecimento silencioso, **mas não tinha caminho honesto para remover um invariante provadamente morto** (ex.: regra/fixture protegendo um arquivo que não existe mais). Invariantes mortos acumulavam para sempre.

## O que foi entregue

Um mecanismo de aposentadoria que **não pode virar enfraquecimento silencioso**, por construção:

1. **Ledger append-only com hash-chain** (`.atomic/security-retirements.jsonl`): cada registro encadeia `prevSha256 → recordSha256`. Qualquer adulteração ou quebra de cadeia **desativa todas as isenções** (fail-closed).
2. **Prova de nulidade verificável por máquina** (não basta prosa, rechecada contra o repo vivo a cada execução):
   - `absent-path-target`: o alvo referencia um caminho que **não existe** em lugar nenhum do repo.
   - `duplicate-regex`: existe uma duplicata **viva** idêntica que preserva a cobertura.
3. **Lei monotônica redefinida**: a catraca passa a medir **`vivos + aposentados ≥ baseline`**. Aposentar 1 invariante nulo mantém o acumulado → não é regressão. Sem ledger, o comportamento é **idêntico** ao anterior.

## Arquivos (no core, via expand_self)

- `scripts/mcp/atomic-edit/security-invariant-retirement.mjs` — módulo (ledger, hash-chain, verificação de nulidade, classificação fail-closed).
- `scripts/mcp/atomic-edit/gates/security-invariant-retirement.proof.mjs` — gate de prova (14 checagens).
- `scripts/mcp/atomic-edit/security-invariants.mjs` — `assertSecurityMonotonicity` agora honra aposentadorias (contagem e fixtures).
- `README.md` — inventário sincronizado (189 proof entrypoints / 245 total gate files).

## Validação (tudo verde, executado de verdade)

| Verificação | Resultado |
| --- | --- |
| Lógica do módulo (unit) | 16/16 |
| Integração com a engine real | 4/4 (queda sem aposentadoria recusada; com aposentadoria válida permitida; ledger adulterado recusado) |
| Gate `security-invariant-retirement.proof` | 14/14 |
| `security-monotonicity.proof` (não-regressão) | verde |
| `doc-honesty.proof` | verde |
| `security-invariants --enforce` | verde |
| Suíte vitest do atomic-edit | 96/96 |
| Promoção `atomic_expand_self` | `ok:true, changed:true` (lattice obrigatório verde) |

## Garantia

A própria `atomic_expand_self` só grava quando o lattice converge verde; barrou tentativas com prova desonesta (doc-honesty) e com snapshot transitório, e só admitiu a versão correta. Ou seja: **a feature entrou provada, não declarada.**

## Nota honesta (achado adjacente)

O rollback byte-exato da `expand_self` assume poder deletar arquivos criados; no mount do relay isso bate em `EPERM`, deixando criações órfãs num rollback. Não afetou o resultado final (reconciliado e validado), mas é um efeito real do ambiente degradado (relay/self-hosted) — ligado ao frontier `wholeHostActionSpace`.
