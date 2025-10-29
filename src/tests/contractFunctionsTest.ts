/**
 * Contract Functions Test Suite
 * Tests all public and read-only functions from deployed NFT ticket contracts
 * 
 * Contract: ST26BA8QY8JC11KWDMSQS4ASMY6V2PSYQ26KYBWEX.summer-fest-2025-1760614834147
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Import this file or copy-paste
 * 3. Run: await testAllContractFunctions()
 */

const HIRO_API_BASE = 'https://api.testnet.hiro.so';

// Test contracts
const TEST_CONTRACTS = [
  'ST26BA8QY8JC11KWDMSQS4ASMY6V2PSYQ26KYBWEX.summer-fest-2025-1760614834147',
  'ST26BA8QY8JC11KWDMSQS4ASMY6V2PSYQ26KYBWEX.summer-morning-2027-1760616205675',
];

interface TestResult {
  function: string;
  type: 'read_only' | 'public';
  success: boolean;
  result?: unknown;
  error?: string;
  duration?: number;
}

/**
 * Call a read-only contract function
 */
async function callReadOnlyFunction(
  contractId: string,
  functionName: string,
  args: string[] = []
): Promise<any> {
  const [contractAddress, contractName] = contractId.split('.');
  const url = `${HIRO_API_BASE}/v2/contracts/call-read/${contractAddress}/${contractName}/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: contractAddress,
      arguments: args,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.json();
}

/**
 * Parse Clarity value to JavaScript
 */
function parseClarityValue(clarityValue: any): any {
  if (!clarityValue) return null;

  const type = clarityValue.type;
  const value = clarityValue.value;

  switch (type) {
    case 'uint':
    case 'int':
      return parseInt(value);
    case 'bool':
      return value === 'true' || value === true;
    case 'string-ascii':
    case 'string-utf8':
      return value;
    case 'principal':
      return value;
    case 'optional':
      return value ? parseClarityValue(value.value) : null;
    case 'tuple':
      const tupleData: any = {};
      if (value && typeof value === 'object') {
        Object.keys(value).forEach(key => {
          tupleData[key] = parseClarityValue(value[key]);
        });
      }
      return tupleData;
    case 'list':
      return Array.isArray(value) ? value.map(parseClarityValue) : [];
    default:
      return value;
  }
}

/**
 * Format duration in ms
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Test: get-event-info (read-only)
 * Returns: { event-name, description, event-date, venue, ... }
 */
async function testGetEventInfo(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-event-info');
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-event-info',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-event-info',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-last-token-id (read-only)
 * Returns: uint (last minted token ID)
 */
async function testGetLastTokenId(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-last-token-id');
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-last-token-id',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-last-token-id',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-owner (read-only)
 * Args: token-id (uint)
 * Returns: (optional principal)
 */
async function testGetOwner(contractId: string, tokenId: number = 1): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-owner', [`u${tokenId}`]);
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-owner',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-owner',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-ticket-price (read-only)
 * Returns: uint (price in micro-STX)
 */
async function testGetTicketPrice(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-ticket-price');
    const parsed = parseClarityValue(result.result);
    
    const priceInSTX = parsed ? (parsed / 1000000).toFixed(6) : '0';

    return {
      function: 'get-ticket-price',
      type: 'read_only',
      success: true,
      result: { microSTX: parsed, STX: priceInSTX },
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-ticket-price',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-tickets-remaining (read-only)
 * Returns: uint
 */
async function testGetTicketsRemaining(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-tickets-remaining');
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-tickets-remaining',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-tickets-remaining',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-token-uri (read-only)
 * Args: token-id (uint)
 * Returns: (optional string-ascii) - IPFS URI
 */
async function testGetTokenUri(contractId: string, tokenId: number = 1): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-token-uri', [`u${tokenId}`]);
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-token-uri',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-token-uri',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: get-total-supply (read-only)
 * Returns: uint (max ticket supply)
 */
async function testGetTotalSupply(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'get-total-supply');
    const parsed = parseClarityValue(result.result);

    return {
      function: 'get-total-supply',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'get-total-supply',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: is-event-cancelled (read-only)
 * Returns: bool
 */
async function testIsEventCancelled(contractId: string): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'is-event-cancelled');
    const parsed = parseClarityValue(result.result);

    return {
      function: 'is-event-cancelled',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'is-event-cancelled',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test: is-ticket-used (read-only)
 * Args: token-id (uint)
 * Returns: bool
 */
async function testIsTicketUsed(contractId: string, tokenId: number = 1): Promise<TestResult> {
  const start = Date.now();
  try {

    const result = await callReadOnlyFunction(contractId, 'is-ticket-used', [`u${tokenId}`]);
    const parsed = parseClarityValue(result.result);

    return {
      function: 'is-ticket-used',
      type: 'read_only',
      success: true,
      result: parsed,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
    return {
      function: 'is-ticket-used',
      type: 'read_only',
      success: false,
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Test all read-only functions for a contract
 */
async function testAllReadOnlyFunctions(contractId: string): Promise<TestResult[]> {

  const results: TestResult[] = [];
  
  // Test all read-only functions
  results.push(await testGetEventInfo(contractId));
  results.push(await testGetLastTokenId(contractId));
  results.push(await testGetOwner(contractId, 1));
  results.push(await testGetTicketPrice(contractId));
  results.push(await testGetTicketsRemaining(contractId));
  results.push(await testGetTokenUri(contractId, 1));
  results.push(await testGetTotalSupply(contractId));
  results.push(await testIsEventCancelled(contractId));
  results.push(await testIsTicketUsed(contractId, 1));
  
  return results;
}

/**
 * Print summary of test results
 */
function printSummary(results: TestResult[]) {

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  // Print detailed results table
  console.table(results.map(r => ({
    '📝 Function': r.function,
    '📊 Type': r.type,
    '✓ Status': r.success ? '✅ Pass' : '❌ Fail',
    '⏱️ Time': formatDuration(r.duration || 0),
    '📦 Result': r.success 
      ? (typeof r.result === 'object' ? JSON.stringify(r.result).slice(0, 50) + '...' : String(r.result))
      : r.error?.slice(0, 50) + '...',
  })));
  
  if (failed.length > 0) {

    failed.forEach(f => {

    });
  }
}

/**
 * Main test function - Test all contracts
 */
export async function testAllContractFunctions() {

  const allResults: TestResult[] = [];
  
  for (const contractId of TEST_CONTRACTS) {
    const results = await testAllReadOnlyFunctions(contractId);
    allResults.push(...results);
  }
  
  printSummary(allResults);
  
  return allResults;
}

/**
 * Test single contract
 */
export async function testContract(contractId: string) {
  const results = await testAllReadOnlyFunctions(contractId);
  printSummary(results);
  return results;
}

/**
 * Quick test - just check if contract is accessible
 */
export async function quickTest(contractId: string) {

  try {
    const result = await callReadOnlyFunction(contractId, 'get-total-supply');
    const totalSupply = parseClarityValue(result.result);

    return true;
  } catch (error: any) {
    console.error(`❌ Contract not accessible:`, error.message);
    return false;
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).testAllContractFunctions = testAllContractFunctions;
  (window as any).testContract = testContract;
  (window as any).quickTest = quickTest;

  TEST_CONTRACTS.forEach(c => console.log(`   - ${c}`));

}
