#!/usr/bin/env node
/**
 * guidebook.mjs — PARADIGM PART D A-G2: HIERARCHICAL, INHERITABLE obligations ("guidebooks").
 *
 * Nidus has "guidebooks" — constraint libraries with monotonic inheritance Π(Gparent) ⊆ Π(Gchild): an org
 * standard a project inherits. atomic's taxonomy was FLAT (one global class set). This adds inheritance: a
 * guidebook may `extends` a parent, inheriting all its invariant classes; a child may STRENGTHEN or ADD but
 * never DROP or WEAKEN a parent class — inheritance is monotonic (the L18 coverage ratchet, lifted one level
 * up: instead of "history never regresses", it is "a child never regresses below its parent").
 *
 * Pure: in-memory; no spawn, no Date.now/random.
 */

const RANK = { 'out-of-scope': 0, partial: 1, enforced: 2 };

/**
 * Resolve a guidebook against its ancestor chain into the EFFECTIVE class set.
 * @param {{id:string, extends?:string, classes:Record<string,string>}} book   the leaf guidebook
 * @param {Map<string,object>} registry  id → guidebook
 * @returns {{ok:boolean, effective?:Record<string,string>, error?:string, chain?:string[]}}
 */
export function resolveGuidebook(book, registry) {
  const chain = [];
  const seen = new Set();
  let cur = book;
  // walk up to the root, collecting the chain (detect cycles)
  while (cur) {
    if (seen.has(cur.id)) return { ok: false, error: `guidebook inheritance cycle at ${cur.id}` };
    seen.add(cur.id);
    chain.push(cur.id);
    if (!cur.extends) break;
    const parent = registry.get(cur.extends);
    if (!parent) return { ok: false, error: `guidebook ${cur.id} extends unknown ${cur.extends}` };
    cur = parent;
  }
  // fold root → leaf so a child OVERRIDES (only upward in rank — enforced below)
  const effective = {};
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const b = registry.get(chain[i]) ?? book;
    for (const [cls, status] of Object.entries(b.classes ?? {})) effective[cls] = status;
  }
  return { ok: true, effective, chain };
}

/**
 * Check that a child guidebook MONOTONICALLY inherits its parent: every parent class is present in the child
 * at a rank >= the parent's (no class dropped, no status weakened). The A-G2 inheritance invariant.
 * @returns {{ok:boolean, violations:string[]}}
 */
export function checkInheritanceMonotonic(child, registry) {
  if (!child.extends) return { ok: true, violations: [] };
  const parent = registry.get(child.extends);
  if (!parent) return { ok: false, violations: [`extends unknown ${child.extends}`] };
  const parentEff = resolveGuidebook(parent, registry);
  if (parentEff.ok !== true) return { ok: false, violations: [parentEff.error] };
  const childEff = resolveGuidebook(child, registry);
  if (childEff.ok !== true) return { ok: false, violations: [childEff.error] };
  const violations = [];
  for (const [cls, pStatus] of Object.entries(parentEff.effective)) {
    const cStatus = childEff.effective[cls];
    if (cStatus === undefined) { violations.push(`DROPPED:${cls}`); continue; }
    if ((RANK[cStatus] ?? 0) < (RANK[pStatus] ?? 0)) violations.push(`WEAKENED:${cls}(${pStatus}->${cStatus})`);
  }
  return { ok: violations.length === 0, violations };
}

/** The classes a child ADDS beyond its parent (the legitimate, monotonic extension). */
export function addedClasses(child, registry) {
  if (!child.extends) return Object.keys(child.classes ?? {});
  const parent = registry.get(child.extends);
  const parentEff = parent ? resolveGuidebook(parent, registry) : { ok: true, effective: {} };
  const childEff = resolveGuidebook(child, registry);
  if (childEff.ok !== true) return [];
  return Object.keys(childEff.effective).filter((c) => !(c in (parentEff.effective ?? {})));
}
