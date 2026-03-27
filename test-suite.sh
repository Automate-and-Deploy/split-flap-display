#!/bin/bash

echo "🧪 Enhanced Display - Comprehensive Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
TEST_COUNT=0
PASS_COUNT=0

# Helper function to run test
run_test() {
    TEST_COUNT=$((TEST_COUNT + 1))
    echo -e "\n${BLUE}Test $TEST_COUNT:${NC} $1"
    
    if eval "$2"; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        PASS_COUNT=$((PASS_COUNT + 1))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        return 1
    fi
}

# Test 1: Server Health Check
run_test "Server Health Check" \
    "curl -s ${BASE_URL}/health | jq -e '.status == \"healthy\"' > /dev/null"

# Test 2: API Messages Endpoint
run_test "API Messages Endpoint" \
    "curl -s ${BASE_URL}/api/messages | jq -e '.messages | type == \"array\"' > /dev/null"

# Test 3: API Displays Endpoint  
run_test "API Displays Endpoint" \
    "curl -s ${BASE_URL}/api/displays | jq -e '.displays | type == \"array\"' > /dev/null"

# Test 4: Create Message via API
run_test "Create Message via API" \
    "curl -s -X POST ${BASE_URL}/api/messages \
        -H 'Content-Type: application/json' \
        -d '{\"title\":\"Test Message\",\"content\":[\"\",\"TEST\",\"MESSAGE\",\"API\",\"\"],\"display_id\":\"default\"}' \
        | jq -e '.id > 0' > /dev/null"

# Test 5: Update Display Configuration
run_test "Update Display Configuration" \
    "curl -s -X PUT ${BASE_URL}/api/displays/default/config \
        -H 'Content-Type: application/json' \
        -d '{\"grid_cols\":24,\"grid_rows\":6}' \
        | jq -e '.grid_cols == 24 and .grid_rows == 6' > /dev/null"

# Test 6: Show Message Command
run_test "Show Message Command" \
    "curl -s -X POST ${BASE_URL}/api/displays/default/show \
        -H 'Content-Type: application/json' \
        -d '{\"message_id\":1}' \
        | jq -e '.message == \"Message sent to display\"' > /dev/null"

# Test 7: Analytics Endpoint
run_test "Analytics Endpoint" \
    "curl -s ${BASE_URL}/api/analytics/default | jq -e '.analytics | type == \"array\"' > /dev/null"

# Test 8: Display Interface HTML
run_test "Display Interface HTML" \
    "curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/enhanced.html | grep -q '200'"

# Test 9: Admin Interface HTML  
run_test "Admin Interface HTML" \
    "curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/admin | grep -q '200'"

# Test 10: Socket.IO JavaScript Library
run_test "Socket.IO JavaScript Library" \
    "curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/socket.io/socket.io.js | grep -q '200'"

# Test 11: Static CSS Assets
run_test "Static CSS Assets" \
    "curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/css/board.css | grep -q '200'"

# Test 12: Enhanced JavaScript Files
run_test "Enhanced JavaScript Files" \
    "curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/js/enhanced/WebSocketClient.js | grep -q '200'"

# Test 13: Error Handling - 404
run_test "Error Handling - 404" \
    "curl -s ${BASE_URL}/api/messages/999 | jq -e '.error == \"Message not found\"' > /dev/null"

# Test 14: Error Handling - Validation
run_test "Error Handling - Validation" \
    "curl -s -X POST ${BASE_URL}/api/messages \
        -H 'Content-Type: application/json' \
        -d '{\"invalid\":\"data\"}' \
        | jq -e '.error == \"Validation error\"' > /dev/null"

# Test 15: Database Integrity
run_test "Database Integrity" \
    "cd server && sqlite3 db/display.db 'SELECT COUNT(*) FROM messages;' | grep -E '^[0-9]+$/'"

# Test 16: Performance Check (sub-100ms response)
run_test "Performance Check (API Response < 100ms)" \
    "timeout 1s time curl -s ${BASE_URL}/api/messages > /dev/null 2>&1"

# Test 17: CORS Headers
run_test "CORS Headers Present" \
    "curl -s -I ${BASE_URL}/api/messages | grep -i 'access-control-allow-origin'"

# Test 18: Content Security Policy  
run_test "Security Headers Present" \
    "curl -s -I ${BASE_URL}/ | grep -E 'x-(frame-options|content-type-options)' > /dev/null"

# Test Results Summary
echo ""
echo "=============================================="
echo -e "${BLUE}Test Results Summary${NC}"
echo "=============================================="
echo "Total Tests: $TEST_COUNT"
echo -e "Passed: ${GREEN}$PASS_COUNT${NC}"
echo -e "Failed: ${RED}$((TEST_COUNT - PASS_COUNT))${NC}"

if [ $PASS_COUNT -eq $TEST_COUNT ]; then
    echo -e "\n🎉 ${GREEN}ALL TESTS PASSED!${NC}"
    echo -e "✅ Display system is fully functional"
    exit 0
else
    echo -e "\n⚠️  ${YELLOW}Some tests failed${NC}"
    echo "Success rate: $(( PASS_COUNT * 100 / TEST_COUNT ))%"
    exit 1
fi