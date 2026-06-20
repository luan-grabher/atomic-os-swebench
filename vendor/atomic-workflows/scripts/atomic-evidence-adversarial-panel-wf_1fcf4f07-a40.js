export const meta = {
  name: 'atomic-evidence-adversarial-panel',
  description: 'Verificadores independentes recomputam cada número do dossiê de evidência e tentam refutá-los',
  phases: [{ title: 'Verify', detail: '5 verificadores independentes, cada um recomputa do zero' }],
}

const VERDICT = {
  type: 'object',
  required: ['claim', 'recomputed', 'matches', 'refuted', 'notes'],
  properties: {
    claim: { type: 'string' },
    recomputed: { type: 'string', description: 'o valor/resultado que VOCÊ obteve recomputando do zero' },
    matches: { type: 'boolean', description: 'seu recompute bate com o número alegado?' },
    refuted: { type: 'boolean', description: 'true se a alegação está errada ou enganosa como formulada' },
    notes: { type: 'string', description: 'defeitos metodológicos, ressalvas, ou confirmação' },
  },
}

const COMMON = `Você é um verificador ADVERSARIAL independente no repo /Users/danielpenin/kloel. Sua missão é tentar REFUTAR a alegação — não confirmá-la por preguiça. Recompute do zero com seu próprio código; não confie nos harnesses existentes (não os importe; escreva seu próprio one-liner node). REGRAS DE FERRAMENTA: o Bash nativo é bloqueado para shell neste host — use a ferramenta MCP mcp__atomic-edit__atomic_exec (carregue-a via ToolSearch select:mcp__atomic-edit__atomic_exec) com proveEffect:true e effectRoot:"scripts/mcp/atomic-edit-bench". Comandos node -e "..." funcionam. Seja preciso com números exatos.`

phase('Verify')
const claims = [
  {
    label: 'v1:zero-quebras-persistidas',
    prompt: `${COMMON}
ALEGAÇÃO A REFUTAR: "Em 9.303 traces de operações persistidas em .atomic/traces/*.json, TODAS têm validation.syntaxErrorsBefore/After numéricos, e ZERO operações com base limpa (before==0) persistiram erros novos (after>before). Apenas 6 operações tinham base já suja (before>0)."
Recompute: varra TODOS os .json de .atomic/traces com node (readdirSync+JSON.parse), conte: total, quantos têm validation numérico, quantos before==0 && after>before (liste os operationIds se houver!), quantos before>0. Procure ativamente o contraexemplo.`,
  },
  {
    label: 'v2:exec-ledger-contagens',
    prompt: `${COMMON}
ALEGAÇÃO A REFUTAR: "O .atomic/exec-ledger.jsonl tem ~21.518 registros discriminados por kind: exec≈14.871 (sendo ≈11.142 exitCode 0 e ≈3.729 não-zero), refused≈6.508 (recusas PRÉ-SPAWN com campo reason), spawn-error≈125, timeout≈14. p50 de durationMs dos exec ≈208ms. Os números podem ter crescido alguns registros desde a medição (ledger vivo) — refute apenas se houver divergência ESTRUTURAL (>1% ou categoria errada)."
Recompute com seu próprio parser linha-a-linha. Verifique também: os kind:refused têm mesmo um campo reason não-vazio? Algum refused tem exitCode (o que indicaria que rodou)?`,
  },
  {
    label: 'v3:bypass-ledger',
    prompt: `${COMMON}
ALEGAÇÃO A REFUTAR: "O .atomic/bypass-ledger.jsonl tem ~1.001 registros; ~994 com blockedByDenyHook:true (ou preventedByDenyHook:true); ZERO bypasses silenciosamente permitidos (silentlyAllowed:true ou bypassed:true). Ledger vivo — pequeno crescimento ok, refute só divergência estrutural."
Recompute linha-a-linha. Examine os ~7 registros que NÃO são prevented: o que são? São bypasses reais não contados? Liste suas chaves e julgue honestamente se a alegação "0 bypasses silenciosos" sobrevive.`,
  },
  {
    label: 'v4:bench-determinismo',
    prompt: `${COMMON}
ALEGAÇÃO A REFUTAR: "O benchmark scripts/mcp/atomic-edit-bench/mutation-bench.mjs é determinístico: re-executá-lo produz totais IDÊNTICOS aos gravados em scripts/mcp/atomic-edit-bench/bench-result.json (totals: proposals 635, atomicRefused 378, controlPersistedInvalid 378; benign: 182/142/40)."
Recompute: rode node scripts/mcp/atomic-edit-bench/mutation-bench.mjs > /dev/null é proibido — em vez disso rode e capture para um arquivo NOVO dentro de scripts/mcp/atomic-edit-bench (ex.: bench-rerun-verify.json) e compare os campos totals/benign/parserBlindGrammars com o bench-result.json. Timeout: use timeoutMs 300000. Reporte qualquer divergência.`,
  },
  {
    label: 'v5:ataque-metodologico',
    prompt: `${COMMON}
ALVO: o DESENHO do benchmark em scripts/mcp/atomic-edit-bench/mutation-bench.mjs (leia o arquivo com a ferramenta Read) e a interpretação "braço controle persistiu 378 estados inválidos; braço atomic persistiu 0; benigno admitido 142/182 com 40 falsos-positivos todos em SQL".
Sua missão: ataque a METODOLOGIA como um revisor hostil de paper de sistemas. Considere no mínimo: (1) circularidade juiz-e-gabarito (mesmo validador nos 2 braços — o que isso permite e o que NÃO permite concluir), (2) o braço controle é um strawman? (agentes reais re-leem/testam depois), (3) amostra css=2 e html cego, (4) mutações sintéticas vs erros reais de LLM, (5) a exclusão parserBlind esconde fraqueza ou é honesta, (6) o falso-positivo SQL 40/40 — o que ele implica sobre o gate SQL do atomic em produção (comentários -- contados como erro?). Veredito: quais frases o dossiê PODE afirmar honestamente e quais NÃO pode.`,
  },
]

const results = await parallel(claims.map((c) => () => agent(c.prompt, { label: c.label, phase: 'Verify', schema: VERDICT })))
const paired = results.map((r, i) => ({ verifier: claims[i].label, ...(r ?? { claim: 'AGENT-DIED', recomputed: '', matches: false, refuted: false, notes: 'agente morreu' }) }))
log(`refutados: ${paired.filter((p) => p.refuted).length}/${paired.length}`)
return paired