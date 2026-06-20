export const meta = {
  name: 'kloel-frontier-verification',
  description: 'Full-repo verification sweep: all backend/frontend tests, types, lint, gates — structured failure report',
  phases: [{ title: 'Verify' }],
}

const SCHEMA = {
  type: 'object',
  required: ['slice', 'status', 'failures'],
  properties: {
    slice: { type: 'string' },
    status: { type: 'string', enum: ['green', 'red', 'partial', 'blocked-sandbox'] },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['where', 'what'],
        properties: {
          where: { type: 'string', description: 'file/suite/gate name' },
          what: { type: 'string', description: 'failure essence, first error lines' },
          sandboxArtifact: { type: 'boolean', description: 'true if EPERM/listen/socket sandbox artifact, not real' },
        },
      },
    },
    notes: { type: 'string' },
  },
}

const COMMON = `Você verifica o repo /Users/danielpenin/kloel (branch feat/kloel-honest-completion-20260609). Shell SÓ via mcp__atomic-edit__atomic_exec com proveEffect:true, effectRoot ".atomic-run", env NODE_OPTIONS=--max-old-space-size=6144, timeoutMs 600000. NÃO edite nada — só rode e reporte. ARTEFATOS DE SANDBOX CONHECIDOS (marque sandboxArtifact:true, não são bugs): jest junit EPERM (use --reporters=default), vitest junit (use --reporter=default), supertest listen EPERM (compliance.controller.spec), mkdtemp EPERM na raiz, tsc tsbuildinfo EPERM (use --incremental false). Reporte só FALHAS REAIS com o essencial do erro (3-5 linhas).`

const SLICES = []
for (let i = 0; i < 4; i++) {
  SLICES.push({
    key: `backend-jest-${i + 1}`,
    prompt: `${COMMON}
FATIA backend jest ${i + 1}/4: liste os specs com atomic_exec: cd backend && find src -name '*.spec.ts' | sort — pegue o quarto ${i + 1} da lista (divida o total por 4, arredonde; quarto ${i + 1} = índices [${i}*N/4, ${i + 1}*N/4)). Rode em LOTES de no máximo ~80 arquivos por atomic_exec (cd backend && npx jest --reporters=default --silent <files...> 2>&1 | tail -30) até cobrir o quarto inteiro. Reporte cada suite que falhar com o nome do teste e o erro essencial.`,
  })
}
SLICES.push({
  key: 'frontend-vitest',
  prompt: `${COMMON}
FATIA frontend vitest COMPLETO: cd frontend && npx vitest run --pool=threads --reporter=default 2>&1 | tail -60 (um atomic_exec; se estourar timeout, divida por diretórios de src). Reporte falhas reais.`,
})
SLICES.push({
  key: 'types-lint',
  prompt: `${COMMON}
FATIA tipos+lint: (a) cd backend && npx tsc --noEmit --incremental false -p tsconfig.json; (b) cd frontend && npx tsc --noEmit --incremental false; (c) cd backend && npm run lint:check 2>&1 | tail -20; (d) cd frontend && npm run lint 2>&1 | tail -20. Reporte qualquer erro real (warnings de unused-disable-directive já conhecidos: liste a contagem em notes, não como failure).`,
})
SLICES.push({
  key: 'gates',
  prompt: `${COMMON}
FATIA gates de governança: rode um a um, cada qual num atomic_exec separado, e reporte o veredito de cada: npm run check:canonical-mind; npm run check:canonical-capability; npm run canonical:check; npm run check:governance; npm run check:visual; npm run check:tests; npm run check:security; npm run architecture:check; npm run ratchet:check (se existir; confira em package.json). Gate que falhar por artefato de sandbox → sandboxArtifact:true. Reporte vermelhos reais com a saída essencial.`,
})

phase('Verify')
const results = await parallel(SLICES.map((s) => () => agent(s.prompt, { label: s.key, schema: SCHEMA })))
return results.filter(Boolean)
