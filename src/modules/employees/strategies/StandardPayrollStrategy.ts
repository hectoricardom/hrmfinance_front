import {
  IPayrollStrategy,
  PayrollContext,
  PayrollResult,
  ValidationResult,
  PayrollStrategyConfig,
} from './IPayrollStrategy';

/**
 * Standard US Payroll Strategy
 *
 * Features:
 * - Overtime after 40 hours/week at 1.5x base rate
 * - Federal tax withholding (simplified)
 * - State tax withholding
 * - FICA tax (Social Security 6.2% + Medicare 1.45%)
 * - Insurance deductions
 * - Support for both hourly and salary employees
 */
export class StandardPayrollStrategy implements IPayrollStrategy {
  readonly id = 'standard';
  readonly name = 'Standard US Payroll';
  readonly description = 'Standard US payroll with overtime after 40 hours/week at 1.5x rate';

  private config: PayrollStrategyConfig = {
    standardHoursPerWeek: 40,
    overtimeThreshold: 40,
    overtimeMultiplier: 1.5,
    taxRates: {
      federal: 0.12, // 12% simplified federal tax
      state: 0.05,   // 5% simplified state tax
      socialSecurity: 0.062, // 6.2% FICA Social Security
      medicare: 0.0145, // 1.45% FICA Medicare
    },
  };

  configure(config: PayrollStrategyConfig): void {
    this.config = { ...this.config, ...config };
    if (config.taxRates) {
      this.config.taxRates = { ...this.config.taxRates, ...config.taxRates };
    }
  }

  getDefaultConfig(): PayrollStrategyConfig {
    return { ...this.config };
  }

  validate(context: PayrollContext): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate employee data
    if (!context.employee.id) {
      errors.push('Employee ID is required');
    }

    if (!context.employee.name) {
      errors.push('Employee name is required');
    }

    // Validate pay type and rates
    const payType = context.employee.payType || 'hourly';

    if (payType === 'hourly') {
      if (context.employee.hourlyRate === undefined || context.employee.hourlyRate === null) {
        errors.push('Hourly rate is required for hourly employees');
      } else if (context.employee.hourlyRate < 0) {
        errors.push('Hourly rate cannot be negative');
      } else if (context.employee.hourlyRate === 0) {
        warnings.push('Hourly rate is zero');
      }
    } else if (payType === 'salary') {
      if (context.employee.annualSalary === undefined || context.employee.annualSalary === null) {
        errors.push('Annual salary is required for salaried employees');
      } else if (context.employee.annualSalary < 0) {
        errors.push('Annual salary cannot be negative');
      } else if (context.employee.annualSalary === 0) {
        warnings.push('Annual salary is zero');
      }
    }

    // Validate timesheet
    if (!context.timesheet) {
      errors.push('Timesheet is required');
    } else {
      if (!context.timesheet.weekStartDate) {
        errors.push('Week start date is required');
      }

      if (!context.timesheet.weekEndDate) {
        errors.push('Week end date is required');
      }

      if (context.timesheet.totalHours < 0) {
        errors.push('Total hours cannot be negative');
      }

      if (context.timesheet.totalOvertimeHours < 0) {
        errors.push('Overtime hours cannot be negative');
      }

      if (context.timesheet.totalOvertimeHours > context.timesheet.totalHours) {
        errors.push('Overtime hours cannot exceed total hours');
      }

      // Validate daily entries
      if (!context.timesheet.dailyEntries) {
        errors.push('Daily entries are required');
      } else {
        Object.entries(context.timesheet.dailyEntries).forEach(([day, entry]) => {
          if (entry.hoursWorked < 0) {
            errors.push(`Hours worked on ${day} cannot be negative`);
          }
          if (entry.overtimeHours && entry.overtimeHours < 0) {
            errors.push(`Overtime hours on ${day} cannot be negative`);
          }
        });
      }
    }

    // Validate pay period
    if (!context.payPeriod) {
      errors.push('Pay period is required');
    } else {
      if (!context.payPeriod.start) {
        errors.push('Pay period start date is required');
      }
      if (!context.payPeriod.end) {
        errors.push('Pay period end date is required');
      }
      if (!context.payPeriod.type) {
        errors.push('Pay period type is required');
      }
    }

    // Warnings for optional fields
    if (context.employee.overtimeRate === undefined) {
      warnings.push('Overtime rate not specified, using default multiplier');
    }

    if (context.employee.standardHoursPerWeek === undefined) {
      warnings.push('Standard hours per week not specified, using default (40 hours)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  calculate(context: PayrollContext): PayrollResult {
    // Validate first
    const validation = this.validate(context);
    if (!validation.isValid) {
      throw new Error(`Payroll validation failed: ${validation.errors.join(', ')}`);
    }

    const { employee, timesheet } = context;
    const payType = employee.payType || 'hourly';

    // Determine hourly rate
    let hourlyRate: number;
    if (payType === 'hourly') {
      hourlyRate = employee.hourlyRate || 0;
    } else {
      // For salary employees, calculate hourly equivalent
      const annualSalary = employee.annualSalary || 0;
      const standardHours = employee.standardHoursPerWeek || this.config.standardHoursPerWeek || 40;
      hourlyRate = annualSalary / (52 * standardHours);
    }

    // Calculate regular and overtime hours
    const overtimeThreshold = employee.standardHoursPerWeek || this.config.overtimeThreshold || 40;
    const regularHours = Math.min(timesheet.totalHours, overtimeThreshold);
    const overtimeHours = Math.max(0, timesheet.totalHours - overtimeThreshold);

    // Calculate overtime multiplier
    const overtimeMultiplier = employee.overtimeRate || this.config.overtimeMultiplier || 1.5;
    const overtimeRate = hourlyRate * overtimeMultiplier;

    // Calculate gross pay
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * overtimeRate;
    const totalPay = regularPay + overtimePay;

    // Calculate deductions
    const deductions = this.calculateDeductions(totalPay, employee);
    const netPay = totalPay - deductions.taxes - deductions.insurance - (deductions.other || 0);

    // Build breakdown
    const breakdown = {
      regularPay: {
        hours: regularHours,
        rate: hourlyRate,
        amount: regularPay,
      },
      overtimePay: {
        hours: overtimeHours,
        rate: overtimeRate,
        multiplier: overtimeMultiplier,
        amount: overtimePay,
      },
      deductions: this.buildDeductionsBreakdown(totalPay, deductions, employee),
    };

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      regularHours,
      overtimeHours,
      hourlyRate,
      regularPay,
      overtimePay,
      totalPay,
      deductions,
      netPay,
      breakdown,
    };
  }

  private calculateDeductions(
    grossPay: number,
    employee: PayrollContext['employee']
  ): { taxes: number; insurance: number; other?: number } {
    const taxRates = this.config.taxRates || {};

    // Calculate taxes
    let totalTaxes = 0;

    // Federal tax
    const federalTaxRate = employee.taxRate || taxRates.federal || 0.12;
    const federalTax = grossPay * federalTaxRate;
    totalTaxes += federalTax;

    // State tax
    const stateTax = grossPay * (taxRates.state || 0.05);
    totalTaxes += stateTax;

    // FICA taxes (Social Security + Medicare)
    const socialSecurityTax = Math.min(grossPay * (taxRates.socialSecurity || 0.062), 160200 * 0.062 / 52); // 2023 wage base limit
    const medicareTax = grossPay * (taxRates.medicare || 0.0145);
    totalTaxes += socialSecurityTax + medicareTax;

    // Insurance
    const insurance = employee.insuranceDeduction || 0;

    return {
      taxes: Math.round(totalTaxes * 100) / 100,
      insurance: Math.round(insurance * 100) / 100,
      other: 0,
    };
  }

  private buildDeductionsBreakdown(
    grossPay: number,
    deductions: { taxes: number; insurance: number; other?: number },
    employee: PayrollContext['employee']
  ): Array<{ type: string; description: string; amount: number; percentage?: number }> {
    const taxRates = this.config.taxRates || {};
    const breakdown: Array<{ type: string; description: string; amount: number; percentage?: number }> = [];

    // Federal tax
    const federalTaxRate = employee.taxRate || taxRates.federal || 0.12;
    const federalTax = grossPay * federalTaxRate;
    breakdown.push({
      type: 'tax',
      description: 'Federal Income Tax',
      amount: Math.round(federalTax * 100) / 100,
      percentage: federalTaxRate * 100,
    });

    // State tax
    const stateTaxRate = taxRates.state || 0.05;
    const stateTax = grossPay * stateTaxRate;
    breakdown.push({
      type: 'tax',
      description: 'State Income Tax',
      amount: Math.round(stateTax * 100) / 100,
      percentage: stateTaxRate * 100,
    });

    // Social Security
    const socialSecurityRate = taxRates.socialSecurity || 0.062;
    const socialSecurityTax = Math.min(grossPay * socialSecurityRate, 160200 * 0.062 / 52);
    breakdown.push({
      type: 'tax',
      description: 'Social Security (FICA)',
      amount: Math.round(socialSecurityTax * 100) / 100,
      percentage: socialSecurityRate * 100,
    });

    // Medicare
    const medicareRate = taxRates.medicare || 0.0145;
    const medicareTax = grossPay * medicareRate;
    breakdown.push({
      type: 'tax',
      description: 'Medicare (FICA)',
      amount: Math.round(medicareTax * 100) / 100,
      percentage: medicareRate * 100,
    });

    // Insurance
    if (employee.insuranceDeduction && employee.insuranceDeduction > 0) {
      breakdown.push({
        type: 'insurance',
        description: 'Health Insurance',
        amount: Math.round(employee.insuranceDeduction * 100) / 100,
      });
    }

    // Other deductions
    if (deductions.other && deductions.other > 0) {
      breakdown.push({
        type: 'other',
        description: 'Other Deductions',
        amount: Math.round(deductions.other * 100) / 100,
      });
    }

    return breakdown;
  }
}
