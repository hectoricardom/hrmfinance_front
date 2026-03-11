import {
  IPayrollStrategy,
  PayrollContext,
  PayrollResult,
  ValidationResult,
  PayrollStrategyConfig,
} from './IPayrollStrategy';

/**
 * California-Specific Payroll Strategy
 *
 * California Labor Code Requirements:
 * - Daily overtime: Hours over 8 in a single day at 1.5x rate
 * - Daily double time: Hours over 12 in a single day at 2.0x rate
 * - Weekly overtime: Hours over 40 in a week (not already counted as daily OT) at 1.5x rate
 * - 7th consecutive day: First 8 hours at 1.5x, over 8 hours at 2.0x
 * - CA SDI (State Disability Insurance): 1.1% of wages
 * - Higher state income tax rates
 */
export class CaliforniaPayrollStrategy implements IPayrollStrategy {
  readonly id = 'california';
  readonly name = 'California Payroll';
  readonly description =
    'California-specific payroll with daily overtime (>8 hrs @ 1.5x, >12 hrs @ 2.0x) and weekly overtime rules';

  private config: PayrollStrategyConfig = {
    standardHoursPerWeek: 40,
    overtimeThreshold: 8, // Daily overtime threshold
    overtimeMultiplier: 1.5,
    doubleTimeThreshold: 12, // Daily double time threshold
    doubleTimeMultiplier: 2.0,
    taxRates: {
      federal: 0.12, // 12% simplified federal tax
      state: 0.093,  // 9.3% CA state tax (middle bracket)
      socialSecurity: 0.062, // 6.2% FICA Social Security
      medicare: 0.0145, // 1.45% FICA Medicare
      sdi: 0.011, // 1.1% CA State Disability Insurance (2024)
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

      // Validate daily entries (required for CA calculations)
      if (!context.timesheet.dailyEntries) {
        errors.push('Daily entries are required for California payroll calculations');
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

    // Calculate California-specific overtime and double-time
    const hoursBreakdown = this.calculateCaliforniaHours(timesheet.dailyEntries);

    const regularHours = hoursBreakdown.regular;
    const overtimeHours = hoursBreakdown.overtime;
    const doubleTimeHours = hoursBreakdown.doubleTime;

    // Calculate rates
    const overtimeMultiplier = this.config.overtimeMultiplier || 1.5;
    const doubleTimeMultiplier = this.config.doubleTimeMultiplier || 2.0;
    const overtimeRate = hourlyRate * overtimeMultiplier;
    const doubleTimeRate = hourlyRate * doubleTimeMultiplier;

    // Calculate gross pay
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * overtimeRate;
    const doubleTimePay = doubleTimeHours * doubleTimeRate;
    const totalPay = regularPay + overtimePay + doubleTimePay;

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
        hours: overtimeHours + doubleTimeHours, // Combined for compatibility
        rate: overtimeRate,
        multiplier: overtimeMultiplier,
        amount: overtimePay + doubleTimePay,
      },
      deductions: this.buildDeductionsBreakdown(totalPay, deductions, employee),
    };

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      weekStartDate: timesheet.weekStartDate,
      weekEndDate: timesheet.weekEndDate,
      regularHours,
      overtimeHours: overtimeHours + doubleTimeHours, // Combined for compatibility
      hourlyRate,
      regularPay,
      overtimePay: overtimePay + doubleTimePay, // Combined for compatibility
      totalPay,
      deductions,
      netPay,
      breakdown,
    };
  }

  /**
   * Calculate hours according to California labor laws
   * - Daily OT: Hours 8.01-12 at 1.5x
   * - Daily DT: Hours 12+ at 2.0x
   * - Weekly OT: Hours over 40 (not already in daily OT/DT) at 1.5x
   */
  private calculateCaliforniaHours(
    dailyEntries: Record<string, { hoursWorked: number; overtimeHours?: number }>
  ): { regular: number; overtime: number; doubleTime: number } {
    let totalRegular = 0;
    let totalOvertime = 0;
    let totalDoubleTime = 0;
    let totalWeekHours = 0;

    const dailyOTThreshold = this.config.overtimeThreshold || 8;
    const dailyDTThreshold = this.config.doubleTimeThreshold || 12;

    // First pass: Calculate daily overtime and double time
    Object.values(dailyEntries).forEach((entry) => {
      const hoursWorked = entry.hoursWorked;
      totalWeekHours += hoursWorked;

      if (hoursWorked <= dailyOTThreshold) {
        // All regular time
        totalRegular += hoursWorked;
      } else if (hoursWorked <= dailyDTThreshold) {
        // Regular up to threshold, rest is overtime
        totalRegular += dailyOTThreshold;
        totalOvertime += hoursWorked - dailyOTThreshold;
      } else {
        // Regular up to OT threshold, OT from threshold to DT threshold, rest is double time
        totalRegular += dailyOTThreshold;
        totalOvertime += dailyDTThreshold - dailyOTThreshold;
        totalDoubleTime += hoursWorked - dailyDTThreshold;
      }
    });

    // Second pass: Check for weekly overtime
    // Hours over 40 that haven't been counted as daily OT/DT should be overtime
    const weeklyThreshold = this.config.standardHoursPerWeek || 40;
    if (totalWeekHours > weeklyThreshold) {
      const overtimeEligibleHours = totalWeekHours - weeklyThreshold;
      const alreadyOvertimeHours = totalOvertime + totalDoubleTime;

      if (alreadyOvertimeHours < overtimeEligibleHours) {
        // Convert some regular hours to overtime
        const additionalOvertime = overtimeEligibleHours - alreadyOvertimeHours;
        const convertedHours = Math.min(additionalOvertime, totalRegular);
        totalRegular -= convertedHours;
        totalOvertime += convertedHours;
      }
    }

    return {
      regular: Math.round(totalRegular * 100) / 100,
      overtime: Math.round(totalOvertime * 100) / 100,
      doubleTime: Math.round(totalDoubleTime * 100) / 100,
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

    // California state tax (higher than standard)
    const stateTax = grossPay * (taxRates.state || 0.093);
    totalTaxes += stateTax;

    // FICA taxes (Social Security + Medicare)
    const socialSecurityTax = Math.min(grossPay * (taxRates.socialSecurity || 0.062), 160200 * 0.062 / 52);
    const medicareTax = grossPay * (taxRates.medicare || 0.0145);
    totalTaxes += socialSecurityTax + medicareTax;

    // California SDI (State Disability Insurance)
    const sdiTax = grossPay * (taxRates.sdi || 0.011);
    totalTaxes += sdiTax;

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

    // California state tax
    const stateTaxRate = taxRates.state || 0.093;
    const stateTax = grossPay * stateTaxRate;
    breakdown.push({
      type: 'tax',
      description: 'CA State Income Tax',
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

    // California SDI
    const sdiRate = taxRates.sdi || 0.011;
    const sdiTax = grossPay * sdiRate;
    breakdown.push({
      type: 'tax',
      description: 'CA State Disability Insurance (SDI)',
      amount: Math.round(sdiTax * 100) / 100,
      percentage: sdiRate * 100,
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
