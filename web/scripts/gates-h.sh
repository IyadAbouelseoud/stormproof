#!/usr/bin/env bash
# Prompt H gate run (cwd web/, after pnpm build, with `vite preview --port 4172` running). Log: ../qa/track2/results/gates-h.log
L=../qa/track2/results/gates-h.log
: > "$L"
run() { echo "### $*" >> "$L"; "$@" >> "$L" 2>&1; echo "exit $?" >> "$L"; }
run node scripts/demo-walk.mjs http://localhost:4172/
W=390 H=844 run node scripts/demo-walk.mjs http://localhost:4172/
LANG=ar run node scripts/demo-walk.mjs http://localhost:4172/
RM=1 run node scripts/demo-walk.mjs http://localhost:4172/
run node scripts/mode-check.mjs
run node scripts/teen-walk.mjs
W=390 run node scripts/teen-walk.mjs
LANG=ar run node scripts/teen-walk.mjs
run node scripts/smoke.mjs
RM=1 run node scripts/smoke.mjs
run node scripts/smoke-jeddah.mjs
BASE=http://localhost:4172/ run node scripts/judge-walk.mjs
run node scripts/byte-budget.mjs
echo ALLDONE >> "$L"
