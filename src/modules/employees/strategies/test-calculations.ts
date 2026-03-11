/**
 * Test Suite for Payroll Strategies
 *
 * This file contains test cases to verify the accuracy of payroll calculations
 * for both Standard and California strategies.
 */

import {
  PayrollStrategyContext,
  PayrollContext,
  PayrollResult,
} from './index';

interface TestCase {
  name: string;
  strategyType: 'standard' | 'california';
  context: PayrollContext;
  expectedResults: {
    regularHours: number;
    overtimeHours: number;
    grossPay: number;
    minNetPay?: number; // Allow range for tax calculations
    maxNetPay?: number;
  };
}

const testCases: TestCase[] = [
  // Standard Strategy Tests
  {
    name: 'Standard: 40 hours, no overtime',
    strategyType: 'standard',
    context: {
      employee: {
        id: 'test-001',
        name: 'Test Employee 1',
        payType: 'hourly',
        hourlyRate: 20.0,
        standardHoursPerWeek: 40,
        taxRate: 0.12,
        insuranceDeduction: 100,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 40,
        totalOvertimeHours: 0,
        dailyEntries: {
          monday: { hoursWorked: 8 },
          tuesday: { hoursWorked: 8 },
          wednesday: { hoursWorked: 8 },
          thursday: { hoursWorked: 8 },
          friday: { hoursWorked: 8 },
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 0,
      grossPay: 800, // 40 * $20
      minNetPay: 550, // After taxes and insurance
      maxNetPay: 650,
    },
  },
  {
    name: 'Standard: 45 hours with 5 hours overtime',
    strategyType: 'standard',
    context: {
      employee: {
        id: 'test-002',
        name: 'Test Employee 2',
        payType: 'hourly',
        hourlyRate: 25.0,
        standardHoursPerWeek: 40,
        taxRate: 0.12,
        insuranceDeduction: 150,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 45,
        totalOvertimeHours: 5,
        dailyEntries: {
          monday: { hoursWorked: 9 },
          tuesday: { hoursWorked: 9 },
          wednesday: { hoursWorked: 9 },
          thursday: { hoursWorked: 9 },
          friday: { hoursWorked: 9 },
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 5,
      grossPay: 1187.5, // (40 * $25) + (5 * $25 * 1.5)
      minNetPay: 800,
      maxNetPay: 950,
    },
  },
  {
    name: 'Standard: Salary employee 40 hours',
    strategyType: 'standard',
    context: {
      employee: {
        id: 'test-003',
        name: 'Test Employee 3',
        payType: 'salary',
        annualSalary: 52000,
        standardHoursPerWeek: 40,
        taxRate: 0.15,
        insuranceDeduction: 200,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 40,
        totalOvertimeHours: 0,
        dailyEntries: {
          monday: { hoursWorked: 8 },
          tuesday: { hoursWorked: 8 },
          wednesday: { hoursWorked: 8 },
          thursday: { hoursWorked: 8 },
          friday: { hoursWorked: 8 },
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 0,
      grossPay: 1000, // $52,000 / 52 weeks
      minNetPay: 650,
      maxNetPay: 750,
    },
  },
  // California Strategy Tests
  {
    name: 'California: 40 hours, 8 per day, no overtime',
    strategyType: 'california',
    context: {
      employee: {
        id: 'test-004',
        name: 'Test Employee 4',
        payType: 'hourly',
        hourlyRate: 30.0,
        standardHoursPerWeek: 40,
        taxRate: 0.12,
        insuranceDeduction: 150,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 40,
        totalOvertimeHours: 0,
        dailyEntries: {
          monday: { hoursWorked: 8 },
          tuesday: { hoursWorked: 8 },
          wednesday: { hoursWorked: 8 },
          thursday: { hoursWorked: 8 },
          friday: { hoursWorked: 8 },
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 0,
      grossPay: 1200, // 40 * $30
      minNetPay: 800,
      maxNetPay: 950,
    },
  },
  {
    name: 'California: 50 hours with daily overtime',
    strategyType: 'california',
    context: {
      employee: {
        id: 'test-005',
        name: 'Test Employee 5',
        payType: 'hourly',
        hourlyRate: 28.0,
        standardHoursPerWeek: 40,
        taxRate: 0.12,
        insuranceDeduction: 175,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 50,
        totalOvertimeHours: 10,
        dailyEntries: {
          monday: { hoursWorked: 10 }, // 8 regular + 2 OT
          tuesday: { hoursWorked: 10 }, // 8 regular + 2 OT
          wednesday: { hoursWorked: 10 }, // 8 regular + 2 OT
          thursday: { hoursWorked: 10 }, // 8 regular + 2 OT
          friday: { hoursWorked: 10 }, // 8 regular + 2 OT
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 10,
      grossPay: 1540, // (40 * $28) + (10 * $28 * 1.5) = $1,120 + $420
      minNetPay: 1000,
      maxNetPay: 1200,
    },
  },
  {
    name: 'California: 60 hours with double-time',
    strategyType: 'california',
    context: {
      employee: {
        id: 'test-006',
        name: 'Test Employee 6',
        payType: 'hourly',
        hourlyRate: 32.0,
        standardHoursPerWeek: 40,
        taxRate: 0.15,
        insuranceDeduction: 200,
      },
      timesheet: {
        weekStartDate: '2024-01-01',
        weekEndDate: '2024-01-07',
        totalHours: 60,
        totalOvertimeHours: 20,
        dailyEntries: {
          monday: { hoursWorked: 14 }, // 8 regular + 4 OT + 2 DT
          tuesday: { hoursWorked: 14 }, // 8 regular + 4 OT + 2 DT
          wednesday: { hoursWorked: 12 }, // 8 regular + 4 OT
          thursday: { hoursWorked: 10 }, // 8 regular + 2 OT
          friday: { hoursWorked: 10 }, // 8 regular + 2 OT
          saturday: { hoursWorked: 0 },
          sunday: { hoursWorked: 0 },
        },
      },
      payPeriod: {
        start: '2024-01-01',
        end: '2024-01-07',
        type: 'weekly',
      },
    },
    expectedResults: {
      regularHours: 40,
      overtimeHours: 20, // Combined OT and DT
      grossPay: 2176, // (40 * $32) + (16 * $32 * 1.5) + (4 * $32 * 2.0)
      minNetPay: 1400,
      maxNetPay: 1700,
    },
  },
];

/**
 * Run all test cases and report results
 */
export function runTests(): void {
  console.log('\n' + '='.repeat(80));
  console.log('PAYROLL STRATEGY TEST SUITE');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(80));

    try {
      const strategy = new PayrollStrategyContext(testCase.strategyType);
      const result = strategy.calculate(testCase.context);

      const checks = [
        {
          name: 'Regular Hours',
          expected: testCase.expectedResults.regularHours,
          actual: result.regularHours,
          tolerance: 0.01,
        },
        {
          name: 'Overtime Hours',
          expected: testCase.expectedResults.overtimeHours,
          actual: result.overtimeHours,
          tolerance: 0.01,
        },
        {
          name: 'Gross Pay',
          expected: testCase.expectedResults.grossPay,
          actual: result.totalPay,
          tolerance: 0.01,
        },
      ];

      let testPassed = true;

      checks.forEach((check) => {
        const diff = Math.abs(check.actual - check.expected);
        const checkPassed = diff <= check.tolerance;

        if (checkPassed) {
          console.log(`  ✓ ${check.name}: $${check.actual.toFixed(2)} (expected: $${check.expected.toFixed(2)})`);
        } else {
          console.log(`  ✗ ${check.name}: $${check.actual.toFixed(2)} (expected: $${check.expected.toFixed(2)}, diff: $${diff.toFixed(2)})`);
          testPassed = false;
        }
      });

      // Check net pay range
      if (testCase.expectedResults.minNetPay && testCase.expectedResults.maxNetPay) {
        const netPayInRange =
          result.netPay >= testCase.expectedResults.minNetPay &&
          result.netPay <= testCase.expectedResults.maxNetPay;

        if (netPayInRange) {
          console.log(`  ✓ Net Pay: $${result.netPay.toFixed(2)} (expected: $${testCase.expectedResults.minNetPay.toFixed(2)} - $${testCase.expectedResults.maxNetPay.toFixed(2)})`);
        } else {
          console.log(`  ✗ Net Pay: $${result.netPay.toFixed(2)} (expected: $${testCase.expectedResults.minNetPay.toFixed(2)} - $${testCase.expectedResults.maxNetPay.toFixed(2)})`);
          testPassed = false;
        }
      }

      if (testPassed) {
        console.log('  RESULT: PASSED ✓\n');
        passed++;
      } else {
        console.log('  RESULT: FAILED ✗\n');
        failed++;
      }

      // Print detailed breakdown
      console.log('  Breakdown:');
      console.log(`    Regular: ${result.breakdown.regularPay.hours} hrs @ $${result.breakdown.regularPay.rate.toFixed(2)} = $${result.breakdown.regularPay.amount.toFixed(2)}`);
      console.log(`    Overtime: ${result.breakdown.overtimePay.hours} hrs @ $${result.breakdown.overtimePay.rate.toFixed(2)} = $${result.breakdown.overtimePay.amount.toFixed(2)}`);
      console.log(`    Gross: $${result.totalPay.toFixed(2)}`);
      console.log(`    Deductions:`);
      result.breakdown.deductions.forEach((ded) => {
        console.log(`      - ${ded.description}: $${ded.amount.toFixed(2)}${ded.percentage ? ` (${ded.percentage.toFixed(2)}%)` : ''}`);
      });
      console.log(`    Net: $${result.netPay.toFixed(2)}`);
      console.log('');

    } catch (error) {
      console.log(`  ✗ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      console.log('  RESULT: FAILED ✗\n');
      failed++;
    }
  });

  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Run a specific test by index
 */
export function runTest(index: number): void {
  if (index < 0 || index >= testCases.length) {
    console.error(`Invalid test index. Available tests: 0-${testCases.length - 1}`);
    return;
  }

  const testCase = testCases[index];
  console.log(`\nRunning Test: ${testCase.name}\n`);

  const strategy = new PayrollStrategyContext(testCase.strategyType);
  const result = strategy.calculate(testCase.context);

  console.log('Result:', JSON.stringify(result, null, 2));
}

// Export test cases for external use
export { testCases };
