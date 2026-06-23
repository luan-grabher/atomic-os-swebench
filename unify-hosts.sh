#!/usr/bin/env bash
# unify-hosts.sh — aponta TODO host CLI para o ÚNICO launcher atômico canônico.
# Compatível com bash 3.2 (o do macOS): sem mapfile, sem set -u em array vazio.
# Descobre primeiro (imprime onde cada um aponta), depois reaponta com BACKUP de cada
# arquivo tocado. Idempotente (rodar de novo é no-op). Escopo restrito aos diretórios
# de config conhecidos — NÃO varre o home inteiro (por isso é instantâneo e seguro).
#
#   bash ~/atomic-os-swebench/unify-hosts.sh          # descobre + reaponta (com backup)
#   bash ~/atomic-os-swebench/unify-hosts.sh --dry     # só descobre, não edita
#
# Reverter: cada arquivo editado vira <arquivo>.bak-unify-<timestamp>.
set -o pipefail

CANON="$HOME/atomic-os-swebench/core/atomic-edit/atomic-edit-mcp-launcher.sh"
[ -f "$CANON" ] || { echo "ABORT: launcher canônico não existe: $CANON"; exit 1; }
TS="$(date +%Y%m%d-%H%M%S)"
DRY=0; [ "${1:-}" = "--dry" ] && DRY=1

# Diretórios/arquivos de config dos hosts (escopo restrito — estenda se um host viver em outro lugar)
ROOTS="$HOME/.codex $HOME/.claude.json $HOME/.claude $HOME/.config/claude $HOME/.config/claude-code $HOME/.config/opencode $HOME/.config/oh-my-pi $HOME/.oh-my-pi $HOME/.config/omp $HOME/.config/antigravity $HOME/.antigravity $HOME/.config/vibe $HOME/.vibe $HOME/.cursor $HOME/.config/Cursor"

echo "CANÔNICO  →  $CANON"
echo "──────────── DESCOBERTA (quem referencia um launcher atômico) ────────────"

LIST="$(mktemp 2>/dev/null || echo /tmp/unif-list.$$)"
for r in $ROOTS; do
  [ -e "$r" ] && grep -rIls "atomic-edit-mcp-launcher" "$r" 2>/dev/null
done | sort -u > "$LIST"

if [ ! -s "$LIST" ]; then
  echo "(nenhum config nos diretórios escaneados referencia um launcher atômico —"
  echo " ou os hosts vivem em outro caminho; me diga onde e eu estendo o ROOTS)"
  rm -f "$LIST"; exit 0
fi

while IFS= read -r f; do
  cur="$(grep -hoE "[^\"' ]*atomic-edit-mcp-launcher[^\"' ]*" "$f" 2>/dev/null | sort -u | tr '\n' ' ')"
  if [ "$cur" = "$CANON " ]; then tag="já-canônico"; else tag="DIVERGE"; fi
  printf "  [%s] %s\n        -> %s\n" "$tag" "$f" "$cur"
done < "$LIST"

if [ $DRY -eq 1 ]; then echo "── modo --dry: nada editado ──"; rm -f "$LIST"; exit 0; fi

echo "──────────── REAPONTANDO tudo para o canônico (backups: *.bak-unify-$TS) ────────────"
CHANGED=0
while IFS= read -r f; do
  if grep -hoE "[^\"' ]*atomic-edit-mcp-launcher[^\"' ]*" "$f" 2>/dev/null | sort -u | grep -qvxF "$CANON"; then
    cp -p "$f" "$f.bak-unify-$TS"
    perl -pi -e "s#[^\"'\\s]*atomic-edit-mcp-launcher\\.sh#$CANON#g" "$f"
    echo "  reapontado: $f"
    CHANGED=$((CHANGED+1))
  else
    echo "  já-ok:      $f"
  fi
done < "$LIST"
rm -f "$LIST"

echo "──────────── PRONTO: $CHANGED arquivo(s) reapontados; todos agora -> 1 launcher só ────────────"
echo "conferir:"
for r in $ROOTS; do [ -e "$r" ] && grep -rIhoE "[^\"' ]*atomic-edit-mcp-launcher[^\"' ]*" "$r" 2>/dev/null; done | sort -u
