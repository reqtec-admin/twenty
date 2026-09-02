#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

list_file="$root/scripts/stripped-enterprise-files.txt"
mkdir -p "$root/scripts"

echo "Scanning for @license Enterprise files under $root"

mapfile -t files < <(
  grep -RIl --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist \
    --exclude-dir=.yarn --exclude-dir=coverage \
    -e '@license Enterprise' . || true
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No Enterprise-marked files found."
  : > "$list_file"
  exit 0
fi

printf '%s\n' "${files[@]}" | sed 's|^\./||' | sort > "$list_file"
echo "Found ${#files[@]} Enterprise-marked files. Deleting..."

while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  rm -f "$root/$rel"
done < "$list_file"

echo "Deleted files listed in $list_file"
echo
echo "Remaining references to common Enterprise modules (manual cleanup needed):"
grep -RIn --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.yarn \
  -e "core-modules/sso" \
  -e "core-modules/enterprise" \
  -e "row-level-permission" \
  -e "SSOAuthController" \
  -e "WorkspaceSSOModule" \
  -e "EnterpriseModule" \
  . || true
