#!/usr/bin/env bash
# Delete source files whose first non-empty line is the Enterprise license header.
# Do not match the phrase anywhere else (LICENSE / docs mention it).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

allowlist() {
  case "$1" in
    LICENSE|REQTEC.md|scripts/strip-enterprise-files.sh|scripts/stripped-enterprise-files.txt|.github/workflows/strip-enterprise.yml)
      return 0
      ;;
  esac
  return 1
}

mapfile -t files < <(git ls-files)
deleted=()
for f in "${files[@]}"; do
  allowlist "$f" && continue
  [[ -f "$f" ]] || continue
  first="$(grep -m1 -v '^[[:space:]]*$' "$f" || true)"
  if [[ "$first" == '/* @license Enterprise */' ]]; then
    deleted+=("$f")
    rm -f "$f"
  fi
done

mkdir -p scripts
printf '%s\n' "${deleted[@]}" | sort > scripts/stripped-enterprise-files.txt
echo "Removed ${#deleted[@]} Enterprise-header files."
