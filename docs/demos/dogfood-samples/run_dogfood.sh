#!/usr/bin/env bash
# S6-T13 dogfood runner. Drives 5 submissions through the live pipeline,
# saves raw /feedback JSON per sample. summarize_dogfood.py turns the
# results into a markdown table for M1-dogfood.md.
#
# Prereqs: backend API on :5000, AI service on :8001 (with REAL openai key),
# Azurite + SQL Server up.
set +e   # do not abort on individual sample failures — log them in the CSV instead

API="${API:-http://localhost:5000}"
SAMPLES_DIR="$(dirname "$0")"
OUT_DIR="$SAMPLES_DIR/dogfood-results"
mkdir -p "$OUT_DIR"

EMAIL="dogfood-$(date +%s)@codementor.local"
PASSWORD="Strong_Pass_123!"

py_get() { python -c "import sys, json; print(json.load(sys.stdin)$1)" 2>/dev/null; }

echo "→ Registering $EMAIL"
TOKEN=$(curl -sS "$API/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Dogfood\",\"githubUsername\":null}" \
    | py_get "['accessToken']" | tr -d '\r')

echo "→ Starting Python-track assessment + answering 30 questions"
ASSESS_JSON=$(curl -sS "$API/api/assessments" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"track":"Python"}')
AID=$(echo "$ASSESS_JSON" | py_get "['assessmentId']" | tr -d '\r')
QID=$(echo "$ASSESS_JSON" | py_get "['firstQuestion']['questionId']" | tr -d '\r')
for i in $(seq 1 30); do
    RESP=$(curl -sS "$API/api/assessments/$AID/answers" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"questionId\":\"$QID\",\"userAnswer\":\"A\",\"timeSpentSec\":2}")
    NEXT=$(echo "$RESP" | python -c "import sys, json; d=json.load(sys.stdin); n=d.get('nextQuestion'); print(n['questionId'] if n else '')" 2>/dev/null | tr -d '\r')
    if [ -n "$NEXT" ]; then QID="$NEXT"; fi
done

echo "→ Fetching active learning path"
PATH_JSON=$(curl -sS "$API/api/learning-paths/me/active" -H "Authorization: Bearer $TOKEN")
mapfile -t TASKS < <(echo "$PATH_JSON" | python -c "import sys, json; [print(t['task']['taskId']) for t in json.load(sys.stdin)['tasks']]" | tr -d '\r')
PYTHON_TASK="${TASKS[0]}"
[ -z "$PYTHON_TASK" ] && { echo "ERROR: no path tasks"; exit 1; }

declare -a SAMPLES=( "sample-1-python-sql-injection" "sample-2-python-clean" "sample-3-js-eval" "sample-4-csharp-null-check" "sample-5-edge-case" )

for i in "${!SAMPLES[@]}"; do
    NAME="${SAMPLES[$i]}"
    ZIP_PATH="$SAMPLES_DIR/$NAME.zip"
    TASK_ID="$PYTHON_TASK"
    if [ "$i" -eq 1 ] && [ "${#TASKS[@]}" -ge 2 ]; then TASK_ID="${TASKS[1]}"; fi

    echo ""
    echo "════ Sample $((i+1))/5: $NAME ════"
    echo "  task: $TASK_ID"

    UPLOAD=$(curl -sS "$API/api/uploads/request-url" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"fileName\":\"$NAME.zip\"}")
    UPLOAD_URL=$(echo "$UPLOAD" | py_get "['uploadUrl']")
    BLOB_PATH=$(echo "$UPLOAD" | py_get "['blobPath']" | tr -d '\r')

    curl -sS -X PUT -H "x-ms-blob-type: BlockBlob" -H "Content-Type: application/zip" --data-binary "@$ZIP_PATH" "$UPLOAD_URL" > /dev/null

    SUBMIT_RESP=$(curl -sS -w "\n%{http_code}" "$API/api/submissions" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d "{\"taskId\":\"$TASK_ID\",\"submissionType\":\"Upload\",\"blobPath\":\"$BLOB_PATH\"}")
    HTTP=$(echo "$SUBMIT_RESP" | tail -1)
    BODY=$(echo "$SUBMIT_RESP" | head -n -1)
    if [ "$HTTP" != "202" ]; then
        echo "  ✗ submit failed [$HTTP]: $BODY"
        echo "{\"error\": \"submit_$HTTP\", \"body\": $BODY}" > "$OUT_DIR/$NAME.json"
        continue
    fi
    SUB_ID=$(echo "$BODY" | py_get "['submissionId']" | tr -d '\r')
    echo "  submission: $SUB_ID"

    START=$(date +%s)
    while true; do
        STATUS=$(curl -sS "$API/api/submissions/$SUB_ID" -H "Authorization: Bearer $TOKEN" | py_get "['status']" | tr -d '\r')
        ELAPSED=$(( $(date +%s) - START ))
        if [ "$STATUS" = "Completed" ] || [ "$STATUS" = "Failed" ]; then break; fi
        if [ "$ELAPSED" -gt 300 ]; then break; fi
        sleep 3
    done
    echo "  status=$STATUS  elapsed=${ELAPSED}s"

    if [ "$STATUS" = "Completed" ]; then
        FB=$(curl -sS -w "\n%{http_code}" "$API/api/submissions/$SUB_ID/feedback" -H "Authorization: Bearer $TOKEN")
        FBHTTP=$(echo "$FB" | tail -1)
        FBBODY=$(echo "$FB" | head -n -1)
        if [ "$FBHTTP" = "200" ]; then
            echo "$FBBODY" > "$OUT_DIR/$NAME.json"
            echo "  ✓ feedback saved ($(echo -n "$FBBODY" | wc -c) bytes)"
        else
            echo "  ✗ feedback returned $FBHTTP"
            echo "{\"error\":\"feedback_$FBHTTP\"}" > "$OUT_DIR/$NAME.json"
        fi
    else
        echo "{\"error\":\"submission_status_$STATUS\",\"elapsedSec\":$ELAPSED}" > "$OUT_DIR/$NAME.json"
    fi
done

echo ""
echo "════════════════════════════════════════════"
echo "Dogfood complete. Per-sample feedback JSON in: $OUT_DIR/"
ls -la "$OUT_DIR"
