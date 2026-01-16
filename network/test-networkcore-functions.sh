#!/bin/bash
# ============================================================================
# NetworkCore v0.0.4 - Complete Function Test Suite
# Tests all 24 governance functions
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run chaincode command
run_query() {
    local function_name=$1
    local args=$2
    
    docker exec \
      -e CORE_PEER_LOCALMSPID=IBNMSP \
      -e CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp \
      ibnts-peer0.ibn.ictu.edu.vn \
      peer chaincode query \
        -C ibnmain \
        -n network-core \
        -c "{\"function\":\"$function_name\",\"Args\":[$args]}"
}

run_invoke() {
    local function_name=$1
    local args=$2
    
    docker exec \
      -e CORE_PEER_LOCALMSPID=IBNMSP \
      -e CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp \
      ibnts-peer0.ibn.ictu.edu.vn \
      peer chaincode invoke \
        -o orderer.ictu.edu.vn:7050 \
        -C ibnmain \
        -n network-core \
        -c "{\"function\":\"$function_name\",\"Args\":[$args]}" \
        --waitForEvent \
        --tls \
        --cafile /crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem
}

test_function() {
    local test_name=$1
    local test_cmd=$2
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[Test $TOTAL_TESTS]${NC} $test_name"
    
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        eval "$test_cmd" || true  # Show error
    fi
}

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  NetworkCore v0.0.4 Function Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"

# ============================================
# ORGANIZATION MANAGEMENT (6 functions)
# ============================================

echo -e "\n${YELLOW}=== ORGANIZATION MANAGEMENT (6 functions) ===${NC}"

test_function "1. QueryOrganizations - Query all" \
  "run_query 'QueryOrganizations' '\"{}\"'"

test_function "2. QueryOrganizations - Filter by status" \
  "run_query 'QueryOrganizations' '\"{\\\"status\\\":\\\"APPROVED\\\"}\"'"

test_function "3. RegisterOrganization - Create TEST-ORG-2" \
  "run_invoke 'RegisterOrganization' '\"TEST-ORG-2\",\"TestMSP2\",\"Test Org 2\",\"test2.com\",\"admin@test2.com\",\"+84-222-333\",\"456 Test Ave\",\"BL-002\",\"TAX-002\",\"[\\\"ISO9001\\\"]\",\"http://ca.test2.com:7054\",\"[\\\"peer0.test2.com:7051\\\"]\",\"{}\"'"

test_function "4. ApproveOrganization - Approve TEST-ORG-2" \
  "run_invoke 'ApproveOrganization' '\"TEST-ORG-2\",\"ADMIN\"'"

test_function "5. SuspendOrganization - Suspend TEST-ORG" \
  "run_invoke 'SuspendOrganization' '\"TEST-ORG\",\"Testing suspension\",\"ADMIN\"'"

test_function "6. RevokeOrganization - Revoke TEST-ORG" \
  "run_invoke 'RevokeOrganization' '\"TEST-ORG\",\"Testing revocation\",\"ADMIN\"'"

# ============================================
# CHAINCODE GOVERNANCE (6 functions)
# ============================================

echo -e "\n${YELLOW}=== CHAINCODE GOVERNANCE (6 functions) ===${NC}"

test_function "7. SubmitChaincodeProposal" \
  "run_invoke 'SubmitChaincodeProposal' '\"{\\\"chaincodeName\\\":\\\"test-cc\\\",\\\"version\\\":\\\"1.0.0\\\",\\\"channel\\\":\\\"ibnmain\\\",\\\"description\\\":\\\"Test chaincode\\\",\\\"endorsementPolicy\\\":\\\"OR(\\\\\\\"IBNMSP.peer\\\\\\\")\\\",\\\"initRequired\\\":false}\",\"ADMIN\"'"

test_function "8. QueryChaincodeProposals" \
  "run_query 'QueryChaincodeProposals' '\"{}\"'"

test_function "9. ApproveChaincodeProposal" \
  "run_invoke 'ApproveChaincodeProposal' '\"PROPOSAL-001\",\"ADMIN\",\"Looks good\"'"

test_function "10. RejectChaincodeProposal" \
  "run_invoke 'RejectChaincodeProposal' '\"PROPOSAL-002\",\"ADMIN\",\"Not ready\"'"

test_function "11. RecordChaincodeDeployment" \
  "run_invoke 'RecordChaincodeDeployment' '\"{\\\"proposalId\\\":\\\"PROPOSAL-001\\\",\\\"packageId\\\":\\\"test-cc_1.0.0:abc123\\\",\\\"sequence\\\":1,\\\"deployedBy\\\":\\\"ADMIN\\\",\\\"transactionId\\\":\\\"tx001\\\"}\"'"

test_function "12. GetChaincodeHistory" \
  "run_query 'GetChaincodeHistory' '\"test-cc\",\"ibnmain\"'"

# ============================================
# CHANNEL MANAGEMENT (5 functions)
# ============================================

echo -e "\n${YELLOW}=== CHANNEL MANAGEMENT (5 functions) ===${NC}"

test_function "13. CreateChannelProposal" \
  "run_invoke 'CreateChannelProposal' '\"{\\\"channelName\\\":\\\"test-channel\\\",\\\"organizations\\\":[\\\"IBN\\\",\\\"TEST-ORG-2\\\"],\\\"description\\\":\\\"Test channel\\\",\\\"orderingService\\\":\\\"orderer.ictu.edu.vn:7050\\\",\\\"batchTimeout\\\":\\\"2s\\\",\\\"maxMessageCount\\\":10}\",\"ADMIN\"'"

test_function "14. ApproveChannelProposal" \
  "run_invoke 'ApproveChannelProposal' '\"CH-PROPOSAL-001\",\"ADMIN\",\"Approved\"'"

test_function "15. AddOrganizationToChannel" \
  "run_invoke 'AddOrganizationToChannel' '\"ibnmain\",\"TEST-ORG-2\",\"ADMIN\"'"

test_function "16. RemoveOrganizationFromChannel" \
  "run_invoke 'RemoveOrganizationFromChannel' '\"test-channel\",\"TEST-ORG-2\",\"ADMIN\",\"Testing removal\"'"

test_function "17. QueryChannels" \
  "run_query 'QueryChannels' '\"{}\"'"

# ============================================
# POLICY MANAGEMENT (3 functions)
# ============================================

echo -e "\n${YELLOW}=== POLICY MANAGEMENT (3 functions) ===${NC}"

test_function "18. CreatePolicy" \
  "run_invoke 'CreatePolicy' '\"{\\\"policyName\\\":\\\"test-policy\\\",\\\"description\\\":\\\"Test policy\\\",\\\"policyType\\\":\\\"ENDORSEMENT\\\",\\\"rules\\\":{\\\"minApprovals\\\":2},\\\"applicableChannels\\\":[\\\"ibnmain\\\"]}\",\"ADMIN\"'"

test_function "19. UpdatePolicy" \
  "run_invoke 'UpdatePolicy' '\"POLICY-001\",\"{\\\"rules\\\":{\\\"minApprovals\\\":3}}\",\"ADMIN\"'"

test_function "20. QueryPolicies" \
  "run_query 'QueryPolicies' '\"{}\"'"

# ============================================
# AUDIT & COMPLIANCE (3 functions)
# ============================================

echo -e "\n${YELLOW}=== AUDIT & COMPLIANCE (3 functions) ===${NC}"

test_function "21. RecordAuditEvent" \
  "run_invoke 'RecordAuditEvent' '\"{\\\"eventType\\\":\\\"TEST_EVENT\\\",\\\"actor\\\":\\\"ADMIN\\\",\\\"action\\\":\\\"TEST\\\",\\\"resource\\\":\\\"test-resource\\\",\\\"details\\\":{\\\"test\\\":true}}\"'"

test_function "22. QueryAuditTrail" \
  "run_query 'QueryAuditTrail' '\"{}\"'"

test_function "23. GenerateComplianceReport" \
  "run_query 'GenerateComplianceReport' '\"ALL\",\"2026-01-01\",\"2026-12-31\"'"

# ============================================
# STATISTICS (1 function)
# ============================================

echo -e "\n${YELLOW}=== STATISTICS (1 function) ===${NC}"

test_function "24. GetPlatformStatistics" \
  "run_query 'GetPlatformStatistics' ''"

# ============================================
# SUMMARY
# ============================================

echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}  Test Results Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Total tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
