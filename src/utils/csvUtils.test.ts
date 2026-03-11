/**
 * Test cases for CSV utilities to demonstrate proper comma handling
 */

import { escapeCSVField, formatCSVRow, parseCSVLine, parseCSV, convertToCSV } from './csvUtils';

// Test data that includes commas within strings
const testData = [
  {
    name: 'John Smith',
    address: '123 Main St, Apt 4B, New York, NY 10001',
    description: 'Payment for "Netflix, Inc." subscription service',
    amount: 15.99,
    notes: 'Contains, multiple, commas'
  },
  {
    name: 'Jane Doe',
    address: '456 Oak Ave, Suite 200, Los Angeles, CA 90210',
    description: 'Transfer to "Bank of America, N.A."',
    amount: 2500.00,
    notes: 'Wire transfer, urgent'
  }
];

// Test CSV string with quoted fields containing commas
const testCSVString = `Name,Address,Description,Amount,Notes
"John Smith","123 Main St, Apt 4B, New York, NY 10001","Payment for ""Netflix, Inc."" subscription service",15.99,"Contains, multiple, commas"
"Jane Doe","456 Oak Ave, Suite 200, Los Angeles, CA 90210","Transfer to ""Bank of America, N.A.""",2500.00,"Wire transfer, urgent"`;

console.log('=== CSV Utilities Test Cases ===\n');

// Test 1: escapeCSVField function
console.log('1. Testing escapeCSVField function:');
console.log('Input: "Netflix, Inc."');
console.log('Output:', escapeCSVField('Netflix, Inc.'));
console.log('Input: "Normal text"');
console.log('Output:', escapeCSVField('Normal text'));
console.log('Input: "Text with ""quotes"" inside"');
console.log('Output:', escapeCSVField('Text with "quotes" inside'));
console.log('');

// Test 2: formatCSVRow function
console.log('2. Testing formatCSVRow function:');
const rowData = ['John Smith', '123 Main St, Apt 4B', 'Netflix, Inc.', 15.99];
console.log('Input:', rowData);
console.log('Output:', formatCSVRow(rowData));
console.log('');

// Test 3: parseCSVLine function
console.log('3. Testing parseCSVLine function:');
const csvLine = '"John Smith","123 Main St, Apt 4B, New York, NY","Payment for ""Netflix, Inc.""",15.99';
console.log('Input:', csvLine);
console.log('Output:', parseCSVLine(csvLine));
console.log('');

// Test 4: parseCSV function
console.log('4. Testing parseCSV function:');
console.log('Input CSV String:');
console.log(testCSVString);
console.log('\nParsed Result:');
const parsed = parseCSV(testCSVString);
console.log('Headers:', parsed.headers);
console.log('Rows:', parsed.rows);
console.log('');

// Test 5: convertToCSV function
console.log('5. Testing convertToCSV function:');
console.log('Input Data:');
console.log(JSON.stringify(testData, null, 2));
console.log('\nGenerated CSV:');
const generatedCSV = convertToCSV(testData);
console.log(generatedCSV);
console.log('');

// Test 6: Round-trip test (convert to CSV and parse back)
console.log('6. Round-trip test (convert to CSV and parse back):');
const roundTripParsed = parseCSV(generatedCSV);
console.log('Original data length:', testData.length);
console.log('Parsed data length:', roundTripParsed.rows.length);
console.log('First row comparison:');
console.log('Original name:', testData[0].name);
console.log('Parsed name:', roundTripParsed.rows[0][0]);
console.log('Original address:', testData[0].address);
console.log('Parsed address:', roundTripParsed.rows[0][1]);
console.log('');

// Test 7: Edge cases
console.log('7. Testing edge cases:');
const edgeCases = [
  'Simple text',
  'Text, with, commas',
  'Text "with quotes"',
  'Text "with quotes, and commas"',
  '"Text already quoted"',
  'Text with\nnewlines',
  '  Text with spaces  ',
  '',
  null,
  undefined
];

edgeCases.forEach((testCase, index) => {
  console.log(`Edge case ${index + 1}:`, testCase, '=>', escapeCSVField(testCase));
});

console.log('\n=== Tests Complete ===');

export {};