#!/usr/bin/env bash
set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
HEAD_REF="${HEAD_REF:-HEAD}"
PR_BODY_FILE="${PR_BODY_FILE:-}"

fail() {
  echo "::error::$1"
  exit 1
}

notice() {
  echo "::notice::$1"
}

if [[ -z "${PR_BODY_FILE}" || ! -f "${PR_BODY_FILE}" ]]; then
  fail "PR body file is missing. The cttx-webapp-delivery checklist cannot be validated."
fi

pr_body="$(cat "${PR_BODY_FILE}")"

required_sections=(
  "cttx-webapp-delivery checklist"
  "User concern"
  "Concrete deliverable"
  "TODO tracking"
  "Regression coverage"
  "Validation"
  "Handoff summary"
)

for section in "${required_sections[@]}"; do
  if ! grep -Fqi "${section}" "${PR_BODY_FILE}"; then
    fail "PR description is missing required cttx-webapp-delivery section: ${section}"
  fi
done

required_checked_items=(
  "I added specific unchecked"
  "I marked them complete only after validation passed"
  "TypeScript passed"
  "Full test suite passed"
  "Build passed"
)

for item in "${required_checked_items[@]}"; do
  if ! grep -Eiq "- \[[xX]\].*${item}" "${PR_BODY_FILE}"; then
    fail "PR checklist item must be checked before merge: ${item}"
  fi
done

if grep -Eiq "- \[ \].*(I added specific unchecked|I marked them complete only after validation passed|TypeScript passed|Full test suite passed|Build passed)" "${PR_BODY_FILE}"; then
  fail "One or more mandatory cttx-webapp-delivery checklist items are still unchecked."
fi

changed_files="$(git diff --name-only "${BASE_REF}"..."${HEAD_REF}")"

if [[ -z "${changed_files}" ]]; then
  notice "No changed files detected against ${BASE_REF}."
  exit 0
fi

product_change_regex='^(client|server|drizzle|shared|storage)/|^package\.json$|^pnpm-lock\.yaml$'
test_change_regex='(\.test\.|\.spec\.)(ts|tsx|js|jsx)$|^tests/|^e2e/'

if echo "${changed_files}" | grep -E "${product_change_regex}" >/dev/null; then
  notice "Product code changes detected; enforcing TODO and regression coverage hygiene."

  if ! echo "${changed_files}" | grep -E '(^|/)todo\.md$' >/dev/null; then
    fail "Product changes must update todo.md according to cttx-webapp-delivery."
  fi

  if ! echo "${changed_files}" | grep -E "${test_change_regex}" >/dev/null; then
    fail "Product changes must include or update regression tests."
  fi
fi

if git diff "${BASE_REF}"..."${HEAD_REF}" -- todo.md 2>/dev/null | grep -E '^\+\s*- \[ \]' >/dev/null; then
  fail "todo.md contains newly added unchecked items in this PR. Complete or move them before requesting merge."
fi

notice "cttx-webapp-delivery PR checklist, TODO tracking, and regression-test hygiene passed."
