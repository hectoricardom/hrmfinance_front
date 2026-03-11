import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { WeeklyTimesheet } from '../modules/employees/types/timesheetTypes';
import { Employee } from '../modules/employees/stores/employeeStore';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}




interface TranslationFunction {
  (key: string, fallback?: string): string;
}

interface TimesheetReportData {
  employee: Employee;
  timesheet: WeeklyTimesheet;
  payroll?: {
    regularHours: number;
    overtimeHours: number;
    hourlyRate: number;
    regularPay: number;
    overtimePay: number;
    totalPay: number;
    deductions?: {
      taxes?: number;
      insurance?: number;
    };
    netPay: number;
  };
}

interface AllEmployeesReportData {
  timesheets: TimesheetReportData[];
  weekStartDate: string;
  weekEndDate: string;
  totalEmployees: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalPayroll: number;
}

/**
 * Generate PDF report for a single employee's timesheet
 */
export const generateEmployeeTimesheetPDF = async (
  data: TimesheetReportData,
  t: TranslationFunction,
  filename?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor = [52, 73, 94]; // #34495e
  const secondaryColor = [41, 128, 185]; // #2980b9
  const accentColor = [231, 76, 60]; // #e74c3c
  const successColor = [39, 174, 96]; // #27ae60
  const lightGray = [236, 240, 241]; // #ecf0f1
  const darkGray = [127, 140, 141]; // #7f8c8d

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} hrs`;
  };

  const addHeader = () => {
    // Header background
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 45, 'F');

    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('timesheets.employeeTimesheetReport', 'Employee Timesheet Report'), pageWidth / 2, 18, { align: 'center' });

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${t('timesheets.weekOf', 'Week of')} ${formatDate(data.timesheet.weekStartDate)} - ${formatDate(data.timesheet.weekEndDate)}`, pageWidth / 2, 28, { align: 'center' });

    // Status badge
    const status = data.timesheet.status;
    const statusText = status === 'draft' ? t('timesheets.draft', 'Draft') :
                      status === 'submitted' ? t('timesheets.submitted', 'Submitted') :
                      status === 'approved' ? t('timesheets.approved', 'Approved') :
                      t('timesheets.paid', 'Paid');

    const statusColor = status === 'draft' ? darkGray :
                       status === 'submitted' ? [243, 156, 18] :
                       status === 'approved' ? successColor :
                       secondaryColor;

    pdf.setFillColor(...statusColor);
    pdf.roundedRect(pageWidth / 2 - 20, 33, 40, 7, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(statusText.toUpperCase(), pageWidth / 2, 38, { align: 'center' });

    yPos = 55;
  };

  const addEmployeeInfo = () => {
    // Employee info box
    pdf.setFillColor(...lightGray);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 25, 'F');

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.employee.name, margin + 5, yPos + 8);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkGray);
    pdf.text(`${t('employees.position', 'Position')}: ${data.employee.position || 'N/A'}`, margin + 5, yPos + 15);
    pdf.text(`${t('employees.department', 'Department')}: ${data.employee.department || 'N/A'}`, margin + 5, yPos + 21);

    // Employee ID on the right
    const rightX = pageWidth - margin - 5;
    pdf.text(`${t('employees.employeeId', 'ID')}: ${data.employee.id.slice(0, 8)}`, rightX, yPos + 15, { align: 'right' });

    yPos += 32;
  };

  const addDailyHoursTable = () => {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text(t('timesheets.dailyHours', 'Daily Hours'), margin, yPos);
    yPos += 8;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = [
      t('timesheets.monday', 'Monday'),
      t('timesheets.tuesday', 'Tuesday'),
      t('timesheets.wednesday', 'Wednesday'),
      t('timesheets.thursday', 'Thursday'),
      t('timesheets.friday', 'Friday'),
      t('timesheets.saturday', 'Saturday'),
      t('timesheets.sunday', 'Sunday')
    ];

    const tableData = days.map((day, index) => {
      const entry = data.timesheet.dailyEntries[day as keyof typeof data.timesheet.dailyEntries];
      return [
        dayLabels[index],
        formatDate(entry.date),
        entry.entryMode === 'clock' ?
          `${entry.startTime || '--'} - ${entry.endTime || '--'}` :
          t('timesheets.manual', 'Manual'),
        formatHours(entry.hoursWorked),
        formatHours(entry.overtimeHours || 0),
        entry.notes || '--'
      ];
    });

    // Add totals row
    tableData.push([
      { content: t('timesheets.total', 'TOTAL'), styles: { fontStyle: 'bold', fillColor: lightGray } },
      { content: '', styles: { fillColor: lightGray } },
      { content: '', styles: { fillColor: lightGray } },
      { content: formatHours(data.timesheet.totalHours), styles: { fontStyle: 'bold', fillColor: lightGray } },
      { content: formatHours(data.timesheet.totalOvertimeHours), styles: { fontStyle: 'bold', fillColor: lightGray } },
      { content: '', styles: { fillColor: lightGray } }
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [[
        t('timesheets.day', 'Day'),
        t('timesheets.date', 'Date'),
        t('timesheets.time', 'Time'),
        t('timesheets.hours', 'Hours'),
        t('timesheets.overtime', 'OT'),
        t('timesheets.notes', 'Notes')
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { halign: 'right', cellWidth: 17 },
        4: { halign: 'right', cellWidth: 17 },
        5: { cellWidth: 'auto' }
      }
    });

    yPos = pdf.lastAutoTable.finalY + 10;
  };

  const addPayrollSummary = () => {
    if (!data.payroll) return;

    // Check for page break
    if (yPos + 60 > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text(t('timesheets.payrollSummary', 'Payroll Summary'), margin, yPos);
    yPos += 8;

    const payrollData = [
      [t('timesheets.regularHours', 'Regular Hours'), formatHours(data.payroll.regularHours)],
      [t('timesheets.regularPay', 'Regular Pay'), formatCurrency(data.payroll.regularPay)],
      [t('timesheets.overtimeHours', 'Overtime Hours'), formatHours(data.payroll.overtimeHours)],
      [t('timesheets.overtimePay', 'Overtime Pay'), formatCurrency(data.payroll.overtimePay)],
      [t('timesheets.hourlyRate', 'Hourly Rate'), formatCurrency(data.payroll.hourlyRate) + '/hr']
    ];

    if (data.payroll.deductions) {
      if (data.payroll.deductions.taxes) {
        payrollData.push([
          t('timesheets.taxes', 'Taxes'),
          `- ${formatCurrency(data.payroll.deductions.taxes)}`
        ]);
      }
      if (data.payroll.deductions.insurance) {
        payrollData.push([
          t('timesheets.insurance', 'Insurance'),
          `- ${formatCurrency(data.payroll.deductions.insurance)}`
        ]);
      }
    }

    autoTable(pdf, {
      startY: yPos,
      body: payrollData,
      theme: 'plain',
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 100, fontStyle: 'normal' },
        1: { halign: 'right', cellWidth: 60, fontStyle: 'normal' }
      }
    });

    yPos = pdf.lastAutoTable.finalY + 5;

    // Total Pay - Highlighted
    pdf.setFillColor(...successColor);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('timesheets.totalPay', 'TOTAL PAY'), margin + 5, yPos + 8);
    pdf.text(formatCurrency(data.payroll.totalPay), pageWidth - margin - 5, yPos + 8, { align: 'right' });

    yPos += 17;

    // Net Pay - Highlighted
    pdf.setFillColor(...secondaryColor);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('timesheets.netPay', 'NET PAY'), margin + 5, yPos + 8);
    pdf.text(formatCurrency(data.payroll.netPay), pageWidth - margin - 5, yPos + 8, { align: 'right' });
  };

  const addFooter = () => {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(...darkGray);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`${t('common.generatedOn', 'Generated on')}: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
      pdf.text(`${t('common.page', 'Page')} ${i} ${t('common.of', 'of')} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  };

  // Generate PDF
  addHeader();
  addEmployeeInfo();
  addDailyHoursTable();
  addPayrollSummary();
  addFooter();

  // Save the PDF
  const pdfFilename = filename || `timesheet-${data.employee.name.replace(/\s/g, '-')}-${data.timesheet.weekStartDate}.pdf`;
  pdf.save(pdfFilename);
  return pdfFilename;
};

/**
 * Generate PDF report for all employees' timesheets
 */
export const generateAllEmployeesTimesheetPDF = async (
  data: AllEmployeesReportData,
  t: TranslationFunction,
  filename?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor = [52, 73, 94];
  const secondaryColor = [41, 128, 185];
  const accentColor = [231, 76, 60];
  const successColor = [39, 174, 96];
  const lightGray = [236, 240, 241];
  const darkGray = [127, 140, 141];

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} hrs`;
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const addHeader = () => {
    // Header background
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, pageWidth, 30, 'F');

    // Title
    pdf.setTextColor(255, 255, 255);
   
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${t('timesheets.weekOf', 'Week of')} ${formatDate(data.weekStartDate)} - ${formatDate(data.weekEndDate)}`, pageWidth / 2, 12, { align: 'center' });

    // Report info
    pdf.setFontSize(10);
    pdf.text(`${t('timesheets.totalEmployees', 'Total Employees')}: ${data.totalEmployees}`, pageWidth / 2, 22, { align: 'center' });

    yPos = 35;
  };

  const addSummarySection = () => {
    // Summary box
    pdf.setFillColor(...lightGray);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 22, 'F');

    pdf.setTextColor(...primaryColor);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('timesheets.overallSummary', 'Overall Summary'), margin + 5, yPos + 8);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...darkGray);

    // Left column
    pdf.text(`${t('timesheets.totalRegularHours', 'Total Regular Hours')}: ${formatHours(data.totalRegularHours)}`, margin + 5, yPos + 16);
    //pdf.text(`${t('timesheets.totalOvertimeHours', 'Total Overtime Hours')}: ${formatHours(data.totalOvertimeHours)}`, margin + 5, yPos + 23);

    // Right column
    const rightX = pageWidth / 2 + 10;
    pdf.text(`${t('timesheets.totalOvertimeHours', 'Total Overtime Hours')}: ${formatHours(data.totalOvertimeHours)}`, rightX, yPos + 16);
    //pdf.text(`${t('common.reportDate', 'Report Date')}: ${new Date().toLocaleDateString()}`, rightX, yPos + 23);

    yPos += 30;
  };

  const addEmployeesTable = () => {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    pdf.text(t('timesheets.employeeDetails', 'Employee Hours by Day'), margin, yPos);
    yPos += 8;

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const tableData = data.timesheets.map(item => {
      const dailyEntries = item.timesheet.dailyEntries;

      return [
        item.employee.name,
        formatHours(dailyEntries.monday?.hoursWorked || 0),
        formatHours(dailyEntries.tuesday?.hoursWorked || 0),
        formatHours(dailyEntries.wednesday?.hoursWorked || 0),
        formatHours(dailyEntries.thursday?.hoursWorked || 0),
        formatHours(dailyEntries.friday?.hoursWorked || 0),
        formatHours(dailyEntries.saturday?.hoursWorked || 0),
        formatHours(dailyEntries.sunday?.hoursWorked || 0),
        formatHours(item.timesheet.totalHours)
      ];
    });

    // Add totals row
    const totals = ['TOTAL'];
    days.forEach(day => {
      const dayTotal = data.timesheets.reduce((sum, item) => {
        const entry = item.timesheet.dailyEntries[day as keyof typeof item.timesheet.dailyEntries];
        return sum + (entry?.hoursWorked || 0);
      }, 0);
      totals.push(formatHours(dayTotal));
    });
    // Add grand total
    const grandTotal = data.timesheets.reduce((sum, item) => sum + item.timesheet.totalHours, 0);
    totals.push(formatHours(grandTotal));

    tableData.push(totals.map((val, idx) => ({
      content: val,
      styles: { fontStyle: 'bold', fillColor: lightGray }
    })));

    autoTable(pdf, {
      startY: yPos,
      head: [[
        t('employees.name', 'Name'),
        t('timesheets.monday', 'Mon'),
        t('timesheets.tuesday', 'Tue'),
        t('timesheets.wednesday', 'Wed'),
        t('timesheets.thursday', 'Thu'),
        t('timesheets.friday', 'Fri'),
        t('timesheets.saturday', 'Sat'),
        t('timesheets.sunday', 'Sun'),
        t('timesheets.total', 'Total')
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 41 },
        1: { halign: 'right', cellWidth: 17 },
        2: { halign: 'right', cellWidth: 17 },
        3: { halign: 'right', cellWidth: 17 },
        4: { halign: 'right', cellWidth: 17 },
        5: { halign: 'right', cellWidth: 17 },
        6: { halign: 'right', cellWidth: 17 },
        7: { halign: 'right', cellWidth: 17 },
        8: { halign: 'right', cellWidth: 20, fontStyle: 'bold' }
      }
    });

    yPos = pdf.lastAutoTable.finalY + 10;
  };

  const addTotalsSection = () => {
    checkPageBreak(40);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...primaryColor);
    //pdf.text(t('timesheets.totalSummary', 'Total Summary'), margin, yPos);
    
    yPos += 5;

    // Total payroll - Highlighted
    pdf.setFillColor(...successColor);
    pdf.rect(margin, yPos, pageWidth - 2 * margin, 15, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('timesheets.totalHoursWorked', 'Total Hours Worked'), margin + 5, yPos + 10);
    pdf.text(`${formatHours(data.totalRegularHours + data.totalOvertimeHours)}`, pageWidth - margin - 5, yPos + 10, { align: 'right' });
  };

  const addFooter = () => {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      // Footer line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(...darkGray);
      pdf.setFont('helvetica', 'normal');

      pdf.text(`${t('common.generatedOn', 'Generated on')}: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
      pdf.text(`${t('common.page', 'Page')} ${i} ${t('common.of', 'of')} ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
  };

  // Generate PDF
  addHeader();
  addSummarySection();
  addEmployeesTable();
  addTotalsSection();
  addFooter();

  // Save the PDF
  const pdfFilename = filename || `all-employees-timesheets-${data.weekStartDate}.pdf`;
  pdf.save(pdfFilename);
  return pdfFilename;
};
