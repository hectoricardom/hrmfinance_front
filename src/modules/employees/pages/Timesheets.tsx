import { Component, createSignal, createMemo, For, Show, onMount, createEffect, on } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import { timesheetStore, getWeekDates } from '../stores/timesheetStore';
import { employeeStore } from '../stores/employeeStore';
import { WeeklyTimesheet, DailyTimeEntry } from '../types/timesheetTypes';
import { useTranslation } from '../../../translations';
import { multiUpd } from '../../../services/utils';
import { generateEmployeeTimesheetPDF, generateAllEmployeesTimesheetPDF } from '../../../utils/timesheetPdfGenerator';
import TimesheetImport from '../components/TimesheetImport';
import TimesheetViewModeToggle, { TimesheetViewMode } from '../components/TimesheetViewModeToggle';
import PayrollStrategySelector from '../components/PayrollStrategySelector';
import BulkTimesheetActions from '../components/BulkTimesheetActions';
import { PayrollStrategyContext } from '../strategies/StrategyContext';

const Timesheets: Component = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [selectedEmployeeId, setSelectedEmployeeId] = createSignal<string>('');
  const [currentWeekStart, setCurrentWeekStart] = createSignal<Date>(new Date());
  const [showPayrollSettings, setShowPayrollSettings] = createSignal(false);
  const [currentTimesheet, setCurrentTimesheet] = createSignal<WeeklyTimesheet | null>(null);
  const [isLoadingTimesheet, setIsLoadingTimesheet] = createSignal(false);
  const [showImportModal, setShowImportModal] = createSignal(false);

  // New state for enhanced features
  const [viewMode, setViewMode] = createSignal<TimesheetViewMode>('week');
  const [payrollStrategy, setPayrollStrategy] = createSignal<string>('standard');
  const [selectedTimesheets, setSelectedTimesheets] = createSignal<string[]>([]);

  // Payroll strategy context
  const payrollContext = () => {
    try {
      return new PayrollStrategyContext(payrollStrategy());
    } catch {
      return new PayrollStrategyContext('standard');
    }
  };

  // Load employees and set employee from URL parameter on mount
  onMount(async () => {
    // Load employees from server
    await employeeStore.loadEmployees();



    const employeeParam = searchParams.employee;
    if (employeeParam) {
     await  timesheetStore.loadTimesheetsByEmployee(employeeParam as string)
      setSelectedEmployeeId(employeeParam);
    }
  });

// s3://qvamarkets/V2_images/7258/IwoHgLlbDNV13fDJ/

  const handleChangeEmployee = async (employeeParam: string)=>{
      setIsLoadingTimesheet(true);
      await  timesheetStore.loadTimesheetsByEmployee(employeeParam as string)
      //console.log(timesheetStore.timesheets)
      /** 
      let ids2delete:string[] = []
      timesheetStore.timesheets.map(async tmS=>{
       
        //await timesheetStore.deleteTimesheet(tmS.id);
        ids2delete.push(tmS.id)
        //return tmS.id
      })
      //console.log(ids2delete)
      console.log(ids2delete.length)
      // await Promise.all(hh)


      // multiUpd(ids2delete, ids2delete.length, timesheetStore.deleteTimesheet)
      */
      setIsLoadingTimesheet(false);
      setSelectedEmployeeId(employeeParam);
  }

  // Get week dates for display - memoized to prevent unnecessary recalculations
  const weekDates = createMemo(() => getWeekDates(currentWeekStart()));

  // Get week start date as a string for tracking
  const weekStartDate = createMemo(() => weekDates().start);

  // Load or create timesheet when employee or week changes
  // Use 'on' to explicitly track only the dependencies we care about
  createEffect(on(
    [selectedEmployeeId, weekStartDate],
    async ([empId, weekStart]) => {


      if (!empId) {
        setCurrentTimesheet(null);
        return;
      }

      // Prevent duplicate calls
      if (isLoadingTimesheet()) {
        return;
      }

      setIsLoadingTimesheet(true);
      try {
        const timesheet = await timesheetStore.getOrCreateTimesheet(empId, weekStart);
        setCurrentTimesheet(timesheet);
      } catch (error) {
        console.error('Failed to load timesheet:', error);
        setCurrentTimesheet(null);
      } finally {
        setIsLoadingTimesheet(false);
      }
    },
    { defer: true } // Don't run on mount, only when dependencies change
  ));

  // Get selected employee details
  const selectedEmployee = createMemo(() => {
    const empId = selectedEmployeeId();
    return employeeStore.getEmployeeById(empId);
  });

  // Calculate payroll for current timesheet
  const payrollCalculation = createMemo(() => {
    const timesheet = currentTimesheet();
    const employee = selectedEmployee();
   
    if (!timesheet || !employee) return null;
   
    let payrol =  timesheetStore.calculatePayroll(timesheet, employee);
   
    return payrol
  });

  // Navigate to previous week
  const previousWeek = () => {
    const current = currentWeekStart();
    const previous = new Date(current);
    previous.setDate(current.getDate() - 7);
    setCurrentWeekStart(previous);
  };

  // Navigate to next week
  const nextWeek = () => {
    const current = currentWeekStart();
    const next = new Date(current);
    next.setDate(current.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Go to current week
  const goToCurrentWeek = () => {
    setCurrentWeekStart(new Date());
  };

  // Update daily entry
  const handleUpdateEntry = (day: keyof WeeklyTimesheet['dailyEntries'], field: 'entryMode' | 'startTime' | 'endTime' | 'hoursWorked' | 'overtimeHours' | 'notes', value: any) => {
    const timesheet = currentTimesheet();
    if (!timesheet) return;

    

    timesheetStore.updateDailyEntry(timesheet.id, day, {
      [field]: value
    });

    // Update local state to reflect changes immediately
    const updated = timesheetStore.getTimesheetById(timesheet.id);
    if (updated) {
      setCurrentTimesheet(updated);
    }
  };

  // Submit timesheet for approval
  const handleSubmit = async () => {
    const timesheet = currentTimesheet();
    if (!timesheet) return;

    if (confirm(t('timesheets.confirmSubmit'))) {
      try {
        await timesheetStore.submitTimesheet(timesheet.id);
        // Reload the timesheet to get updated status
        const updated = timesheetStore.getTimesheetById(timesheet.id);
        if (updated) {
          setCurrentTimesheet(updated);
        }
      } catch (error) {
        console.error('Failed to submit timesheet:', error);
        alert('Failed to submit timesheet. Please try again.');
      }
    }
  };

  // Approve timesheet (for managers)
  const handleApprove = async () => {
    const timesheet = currentTimesheet();
    if (!timesheet) return;

    if (confirm(t('timesheets.confirmApprove'))) {
      try {
        // TODO: Get current user ID
        await timesheetStore.approveTimesheet(timesheet.id, 'manager');
        // Reload the timesheet to get updated status
        const updated = timesheetStore.getTimesheetById(timesheet.id);
        if (updated) {
          setCurrentTimesheet(updated);
        }
      } catch (error) {
        console.error('Failed to approve timesheet:', error);
        alert('Failed to approve timesheet. Please try again.');
      }
    }
  };

  // Bulk action handlers
  const handleBulkApprove = async () => {
    const selected = selectedTimesheets();
    if (selected.length === 0) return;

    if (confirm(`Approve ${selected.length} timesheet(s)?`)) {
      for (const id of selected) {
        try {
          await timesheetStore.approveTimesheet(id, 'manager');
        } catch (error) {
          console.error(`Failed to approve timesheet ${id}:`, error);
        }
      }
      setSelectedTimesheets([]);
      alert(`${selected.length} timesheet(s) approved successfully.`);
    }
  };

  const handleBulkReject = async () => {
    const selected = selectedTimesheets();
    if (selected.length === 0) return;

    const reason = prompt('Enter rejection reason:');
    if (reason) {
      for (const id of selected) {
        try {
          await timesheetStore.rejectTimesheet(id, 'manager', reason);
        } catch (error) {
          console.error(`Failed to reject timesheet ${id}:`, error);
        }
      }
      setSelectedTimesheets([]);
      alert(`${selected.length} timesheet(s) rejected.`);
    }
  };

  const handleBulkExport = (format: 'csv' | 'pdf') => {
    const selected = selectedTimesheets();
    console.log(`Exporting ${selected.length} timesheets as ${format}`);
    // TODO: Implement export functionality
    alert(`Export ${selected.length} timesheets as ${format.toUpperCase()} - Feature coming soon!`);
  };

  const toggleTimesheetSelection = (id: string) => {
    setSelectedTimesheets((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Generate PDF for current employee's timesheet
  const handleGenerateEmployeePDF = async () => {
    const timesheet = currentTimesheet();
    const employee = selectedEmployee();

    if (!timesheet || !employee) {
      alert(t('timesheets.pleaseSelectEmployee', 'Please select an employee first'));
      return;
    }

    try {
      const payroll = payrollCalculation();
      const filename = await generateEmployeeTimesheetPDF(
        {
          employee,
          timesheet,
          payroll: payroll || undefined
        },
        t
      );
      alert(t('timesheets.pdfGenerated', `PDF generated: ${filename}`));
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(t('timesheets.pdfGenerationFailed', 'Failed to generate PDF. Please try again.'));
    }
  };

  // Generate PDF for all employees' timesheets
  const handleGenerateAllEmployeesPDF = async () => {
    const weekStart = weekDates().start;
    const weekEnd = weekDates().end;

    try {
      // Get all timesheets for the current week
      const allTimesheets = timesheetStore.timesheets.filter(
        ts => ts.weekStartDate === weekStart
      );

      if (allTimesheets.length === 0) {
        alert(t('timesheets.noTimesheetsFound', 'No timesheets found for this week'));
        return;
      }

      // Prepare data for each employee
      const timesheetData = allTimesheets.map(timesheet => {
        const employee = employeeStore.getEmployeeById(timesheet.employeeId);
        if (!employee) return null;

        const payroll = timesheetStore.calculatePayroll(timesheet, employee);

        return {
          employee,
          timesheet,
          payroll
        };
      }).filter(item => item !== null);

      // Calculate totals
      const totalRegularHours = timesheetData.reduce((sum, item) => sum + (item!.payroll.regularHours || 0), 0);
      const totalOvertimeHours = timesheetData.reduce((sum, item) => sum + (item!.payroll.overtimeHours || 0), 0);
      const totalPayroll = timesheetData.reduce((sum, item) => sum + (item!.payroll.netPay || 0), 0);

      const filename = await generateAllEmployeesTimesheetPDF(
        {
          timesheets: timesheetData as any,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          totalEmployees: timesheetData.length,
          totalRegularHours,
          totalOvertimeHours,
          totalPayroll
        },
        t
      );

      alert(t('timesheets.pdfGenerated', `PDF generated: ${filename}`));
    } catch (error) {
      console.error('Failed to generate all employees PDF:', error);
      alert(t('timesheets.pdfGenerationFailed', 'Failed to generate PDF. Please try again.'));
    }
  };

  const days: Array<{ key: keyof WeeklyTimesheet['dailyEntries'], label: string }> = [
    { key: 'monday', label: t('timesheets.monday') },
    { key: 'tuesday', label: t('timesheets.tuesday') },
    { key: 'wednesday', label: t('timesheets.wednesday') },
    { key: 'thursday', label: t('timesheets.thursday') },
    { key: 'friday', label: t('timesheets.friday') },
    { key: 'saturday', label: t('timesheets.saturday') },
    { key: 'sunday', label: t('timesheets.sunday') }
  ];

  return (
    <div style={{
      'min-height': '100vh',
      //background: 'var(--primary-color)',
      padding: '2rem'
    }}>
      <div style={{ 'max-width': '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 'margin-bottom': '2rem', display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
          <div>
            <h1 style={{
              'font-size': '2.5rem',
              'font-weight': '700',
              color: 'var(--text-primary)',
              'margin-bottom': '0.5rem',
            }}>
              ⏰ {t('timesheets.employeeTimesheetsTitle')}
            </h1>
            <p style={{
              color: 'var(--text-muted)',
              'font-size': '1.1rem'
            }}>
              {t('timesheets.subtitle')}
            </p>
          </div>
          <TimesheetViewModeToggle
            mode={viewMode()}
            onModeChange={setViewMode}
          />
        </div>

        {/* Bulk Actions Toolbar */}
        <BulkTimesheetActions
          selectedCount={selectedTimesheets().length}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkExport={handleBulkExport}
          onClearSelection={() => setSelectedTimesheets([])}
        />

        {/* Employee Selection Card */}
        <div style={{
          background: 'white',
          'border-radius': '1rem',
          'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
          padding: '2rem',
          'margin-bottom': '1.5rem'
        }}>
          <div style={{
            display: 'grid',
            'grid-template-columns': '1fr auto auto auto',
            gap: '1.5rem',
            'align-items': 'end',
            'flex-wrap': 'wrap'
          }}>
            <div>
              <label style={{
                display: 'block',
                'font-size': '0.875rem',
                'font-weight': '600',
                color: '#4a5568',
                'margin-bottom': '0.5rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em'
              }}>
                👤 {t('timesheets.selectEmployee')}
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  border: '2px solid #e2e8f0',
                  'border-radius': '0.5rem',
                  'font-size': '1rem',
                  'font-weight': '500',
                  color: '#2d3748',
                  background: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                value={selectedEmployeeId()}
                onChange={(e) => handleChangeEmployee(e.target.value)}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <option value="">{t('timesheets.chooseEmployeePlaceholder')}</option>
                <For each={employeeStore.employees}>
                  {(employee) => (
                    <option value={employee.id}>{employee.name} - {employee.position}</option>
                  )}
                </For>
              </select>
            </div>

            {/* Payroll Strategy Selector */}
            <PayrollStrategySelector
              currentStrategy={payrollStrategy()}
              onStrategyChange={setPayrollStrategy}
            />

            {/* Import CSV Button */}
            <div>
              <label style={{
                display: 'block',
                'font-size': '0.875rem',
                'font-weight': '600',
                color: '#4a5568',
                'margin-bottom': '0.5rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em'
              }}>
                📥 {t('timesheets.import', 'Import')}
              </label>
              <button
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  'font-size': '0.95rem',
                  'box-shadow': '0 4px 12px rgba(245, 158, 11, 0.4)',
                  'white-space': 'nowrap'
                }}
                onClick={() => setShowImportModal(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                }}
              >
                📤 {t('timesheets.importCSV', 'Import CSV')}
              </button>
            </div>

            {/* Generate All Employees Report Button */}
            <div>
              <label style={{
                display: 'block',
                'font-size': '0.875rem',
                'font-weight': '600',
                color: '#4a5568',
                'margin-bottom': '0.5rem',
                'text-transform': 'uppercase',
                'letter-spacing': '0.05em'
              }}>
                📊 {t('timesheets.reports', 'Reports')}
              </label>
              <button
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  'font-size': '0.95rem',
                  'box-shadow': '0 4px 12px rgba(102, 126, 234, 0.4)',
                  'white-space': 'nowrap'
                }}
                onClick={handleGenerateAllEmployeesPDF}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                }}
              >
                📄 {t('timesheets.allEmployeesReport', 'All Employees Report')}
              </button>
            </div>

            {/* Individual Employee PDF Button (shown when employee selected) */}
            <Show when={selectedEmployeeId()}>
              <div>
                <label style={{
                  display: 'block',
                  'font-size': '0.875rem',
                  'font-weight': '600',
                  color: '#4a5568',
                  'margin-bottom': '0.5rem',
                  'text-transform': 'uppercase',
                  'letter-spacing': '0.05em'
                }}>
                  💾 {t('timesheets.download', 'Download')}
                </label>
                <button
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    'border-radius': '0.5rem',
                    'font-weight': '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    'font-size': '0.95rem',
                    'box-shadow': '0 4px 12px rgba(16, 185, 129, 0.4)',
                    'white-space': 'nowrap'
                  }}
                  onClick={handleGenerateEmployeePDF}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                  }}
                >
                  📥 {t('timesheets.downloadPDF', 'Download PDF')}
                </button>
              </div>
            </Show>
          {/**
            <Show when={selectedEmployeeId()}>
              <div>
                <label style={{
                  display: 'block',
                  'font-size': '0.875rem',
                  'font-weight': '600',
                  color: '#4a5568',
                  'margin-bottom': '0.5rem',
                  'text-transform': 'uppercase',
                  'letter-spacing': '0.05em'
                }}>
                  ⚙️ {t('timesheets.settings')}
                </label>
                <button
                  style={{
                    padding: '0.875rem 2rem',
                    background: showPayrollSettings() ? '#667eea' : '#f7fafc',
                    color: showPayrollSettings() ? 'white' : '#4a5568',
                    border: '2px solid #667eea',
                    'border-radius': '0.5rem',
                    'font-weight': '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    'font-size': '0.95rem'
                  }}
                  onClick={() => setShowPayrollSettings(!showPayrollSettings())}
                  onMouseEnter={(e) => {
                    if (!showPayrollSettings()) {
                      e.currentTarget.style.background = '#edf2f7';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showPayrollSettings()) {
                      e.currentTarget.style.background = '#f7fafc';
                    }
                  }}
                >
                  {showPayrollSettings() ? t('timesheets.hideSettings') : t('timesheets.showSettings')}
                </button>
              </div>
            </Show>
            */}
          </div>
        </div>

        <Show when={selectedEmployeeId()}>
          {/* Loading Indicator */}
          <Show when={isLoadingTimesheet()}>
            <div style={{
              background: 'white',
              'border-radius': '1rem',
              'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
              padding: '3rem',
              'text-align': 'center',
              'margin-bottom': '1.5rem'
            }}>
              <div style={{
                'font-size': '3rem',
                'margin-bottom': '1rem'
              }}>
                ⏳
              </div>
              <p style={{
                color: 'var(--text-muted)',
                'font-size': '1.1rem'
              }}>
                Loading timesheet...
              </p>
            </div>
          </Show>

          {/* Payroll Settings Panel 
          <Show when={showPayrollSettings() && !isLoadingTimesheet()}>
            <PayrollSettingsPanel employeeId={selectedEmployeeId()!} />
          </Show>
          */}


          {/* Timesheet Content - Only show when loaded */}
          <Show when={!isLoadingTimesheet() && currentTimesheet()}>
            {/* Week Navigation */}
            <div style={{
              background: 'white',
              'border-radius': '1rem',
              'box-shadow': '0 4px 20px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              'margin-bottom': '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                gap: '1rem'
              }}>
                <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  'box-shadow': '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                onClick={previousWeek}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                ← {t('timesheets.previousWeek')}
              </button>

              <div style={{ 'text-align': 'center' }}>
                <div style={{
                  'font-size': '1.25rem',
                  'font-weight': '700',
                  color: '#2d3748',
                  'margin-bottom': '0.25rem'
                }}>
                  📅 {t('timesheets.weekOf')} {weekDates().start} to {weekDates().end}
                </div>
                <button
                  style={{
                    'font-size': '0.875rem',
                    color: '#667eea',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    'font-weight': '600',
                    'text-decoration': 'underline'
                  }}
                  onClick={goToCurrentWeek}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#764ba2'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}
                >
                  {t('timesheets.jumpToCurrentWeek')}
                </button>
              </div>

              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  'border-radius': '0.5rem',
                  'font-weight': '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  'box-shadow': '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                onClick={nextWeek}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {t('timesheets.nextWeek')} →
              </button>
            </div>
          </div>

          {/* Timesheet Status */}
          <Show when={currentTimesheet()}>
            {(timesheet) => (
              <div style={{
                background: 'white',
                'border-radius': '1rem',
                'box-shadow': '0 4px 20px rgba(0,0,0,0.1)',
                padding: '1.5rem',
                'margin-bottom': '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between'
                }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '1rem' }}>
                    <span style={{
                      'font-size': '0.875rem',
                      'font-weight': '600',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>
                      {t('timesheets.status')}:
                    </span>
                    <span style={{
                      padding: '0.5rem 1.25rem',
                      'border-radius': '9999px',
                      'font-size': '0.875rem',
                      'font-weight': '700',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em',
                      ...(timesheet().status === 'draft' ? {
                        background: 'linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%)',
                        color: '#2d3748'
                      } :
                      timesheet().status === 'submitted' ? {
                        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                        color: 'white'
                      } :
                      timesheet().status === 'approved' ? {
                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                        color: 'white'
                      } : {
                        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                        color: 'white'
                      })
                    }}>
                      {timesheet().status === 'draft' ? `📝 ${t('timesheets.draft')}` :
                       timesheet().status === 'submitted' ? `⏳ ${t('timesheets.submitted')}` :
                       timesheet().status === 'approved' ? `✅ ${t('timesheets.approved')}` :
                       `💰 ${t('timesheets.paid')}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Show when={timesheet().status === 'draft'}>
                      <button
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '0.5rem',
                          'font-weight': '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          'box-shadow': '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}
                        onClick={handleSubmit}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                        }}
                      >
                        📤 {t('timesheets.submitForApproval')}
                      </button>
                    </Show>

                    <Show when={timesheet().status === 'submitted'}>
                      <button
                        style={{
                          padding: '0.75rem 1.5rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          'border-radius': '0.5rem',
                          'font-weight': '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          'box-shadow': '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                        onClick={handleApprove}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                        }}
                      >
                        ✅ {t('timesheets.approveTimesheet')}
                      </button>
                    </Show>
                  </div>
                </div>
              </div>
            )}
          </Show>

          {/* Daily Hours Entry */}
          <div style={{
            background: 'white',
            'border-radius': '1rem',
            'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            'margin-bottom': '1.5rem'
          }}>
            <div style={{
              padding: '1.5rem 2rem',
              background: 'var(--primary-color)',
              'border-bottom': '1px solid #e2e8f0'
            }}>
              <h2 style={{
                'font-size': '1.5rem',
                'font-weight': '700',
                color: 'white',
                margin: '0'
              }}>
                📊 {t('timesheets.dailyHoursEntry')}
              </h2>
            </div>

            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                <thead style={{
                  background: '#f7fafc',
                  'border-bottom': '2px solid #e2e8f0'
                }}>
                  <tr>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.day')}</th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.date')}</th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.entryMode')}</th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.timeHoursColumn')}</th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.totalHours')}</th>
                    <th style={{
                      padding: '1rem 1.5rem',
                      'text-align': 'left',
                      'font-size': '0.75rem',
                      'font-weight': '700',
                      color: '#4a5568',
                      'text-transform': 'uppercase',
                      'letter-spacing': '0.05em'
                    }}>{t('timesheets.overtime')}</th>
                    
                  </tr>
                </thead>
                <tbody style={{ background: 'white' }}>
                  <For each={days}>
                    {(day) => {
                      const entry = () => currentTimesheet()?.dailyEntries?.[day.key];
                      const isDisabled = () => currentTimesheet()?.status !== 'draft';

                      return (
                        <tr style={{
                          'border-bottom': '1px solid #e2e8f0',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f7fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                          <td style={{
                            padding: '1.25rem 1.5rem',
                            'font-weight': '600',
                            color: '#2d3748',
                            'font-size': '0.95rem'
                          }}>
                            {day.label}
                          </td>
                          <td style={{
                            padding: '1.25rem 1.5rem',
                            color: '#718096',
                            'font-size': '0.875rem'
                          }}>
                            {entry()?.date}
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  background: entry()?.entryMode === 'clock' ? 'var(--primary-color)' : '#f7fafc',
                                  color: entry()?.entryMode === 'clock' ? 'white' : '#4a5568',
                                  border: entry()?.entryMode === 'clock' ? 'none' : '2px solid #e2e8f0',
                                  'border-radius': '0.5rem',
                                  'font-size': '0.75rem',
                                  'font-weight': '600',
                                  cursor: isDisabled() ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  opacity: isDisabled() ? '0.5' : '1'
                                }}
                                disabled={isDisabled()}
                                onClick={() => handleUpdateEntry(day.key, 'entryMode', 'clock')}
                                title={t('timesheets.clockMode')}
                              >
                                🕐 {t('timesheets.clockMode')}
                              </button>
                              <button
                                style={{
                                  padding: '0.5rem 0.875rem',
                                  background: entry()?.entryMode === 'hours' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f7fafc',
                                  color: entry()?.entryMode === 'hours' ? 'white' : '#4a5568',
                                  border: entry()?.entryMode === 'hours' ? 'none' : '2px solid #e2e8f0',
                                  'border-radius': '0.5rem',
                                  'font-size': '0.75rem',
                                  'font-weight': '600',
                                  cursor: isDisabled() ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.2s',
                                  opacity: isDisabled() ? '0.5' : '1'
                                }}
                                disabled={isDisabled()}
                                onClick={() => handleUpdateEntry(day.key, 'entryMode', 'hours')}
                                title={t('timesheets.hoursMode')}
                              >
                                ⏱️ {t('timesheets.hoursMode')}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <Show when={entry()?.entryMode === 'clock'}>
                              <div style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center' }}>
                                <input
                                  type="time"
                                  style={{
                                    width: '130px',
                                    padding: '0.625rem 0.75rem',
                                    border: '2px solid #e2e8f0',
                                    'border-radius': '0.5rem',
                                    'font-size': '0.875rem',
                                    'font-weight': '600',
                                    color: '#2d3748',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    ...(isDisabled() ? {
                                      background: '#f7fafc',
                                      cursor: 'not-allowed',
                                      color: '#a0aec0'
                                    } : {})
                                  }}
                                  value={entry()?.startTime || ''}
                                  disabled={isDisabled()}
                                  onInput={(e) => handleUpdateEntry(day.key, 'startTime', e.target.value)}
                                  onFocus={(e) => !isDisabled() && (e.currentTarget.style.borderColor = '#667eea')}
                                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                  placeholder="Start"
                                />
                                <span style={{ color: '#a0aec0', 'font-weight': '700' }}>→</span>
                                <input
                                  type="time"
                                  style={{
                                    width: '130px',
                                    padding: '0.625rem 0.75rem',
                                    border: '2px solid #e2e8f0',
                                    'border-radius': '0.5rem',
                                    'font-size': '0.875rem',
                                    'font-weight': '600',
                                    color: '#2d3748',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    ...(isDisabled() ? {
                                      background: '#f7fafc',
                                      cursor: 'not-allowed',
                                      color: '#a0aec0'
                                    } : {})
                                  }}
                                  value={entry()?.endTime || ''}
                                  disabled={isDisabled()}
                                  onInput={(e) => handleUpdateEntry(day.key, 'endTime', e.target.value)}
                                  onFocus={(e) => !isDisabled() && (e.currentTarget.style.borderColor = '#667eea')}
                                  onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                  placeholder="End"
                                />
                              </div>
                            </Show>
                            <Show when={entry()?.entryMode === 'hours'}>
                              <input
                               type="text"
                                style={{
                                  width: '120px',
                                  padding: '0.625rem 0.875rem',
                                  border: '2px solid #e2e8f0',
                                  'border-radius': '0.5rem',
                                  'font-size': '0.95rem',
                                  'font-weight': '600',
                                  color: '#2d3748',
                                  transition: 'all 0.2s',
                                  outline: 'none',
                                  ...(isDisabled() ? {
                                    background: '#f7fafc',
                                    cursor: 'not-allowed',
                                    color: '#a0aec0'
                                  } : {})
                                }}
                                value={entry()?.hoursWorked || 0}
                                disabled={isDisabled()}
                                onInput={(e) => {}}
                                onFocus={(e) => !isDisabled() && (e.currentTarget.style.borderColor = '#10b981')}
                                onBlur={(e) => {
                                    handleUpdateEntry(day.key, 'hoursWorked', parseFloat(e.target.value) || 0)
                                  e.currentTarget.style.borderColor = '#e2e8f0';

                                }}
                                placeholder="Hours"
                              />
                            </Show>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <div style={{
                              padding: '0.625rem 0.875rem',
                              background: entry()?.entryMode === 'clock' ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                              'border-radius': '0.5rem',
                              'text-align': 'center',
                              'font-weight': '700',
                              color: entry()?.entryMode === 'clock' ? '#1e40af' : '#065f46',
                              'font-size': '0.95rem',
                              'min-width': '80px',
                              border: entry()?.entryMode === 'clock' ? '2px solid #667eea' : '2px solid #10b981'
                            }}>
                              {entry()?.hoursWorked?.toFixed(2) || '0.00'} hrs
                            </div>
                          </td>
                          <td style={{ padding: '1.25rem 1.5rem' }}>
                            <input
                              type="text"
                              style={{
                                width: '100px',
                                padding: '0.625rem 0.875rem',
                                border: '2px solid #e2e8f0',
                                'border-radius': '0.5rem',
                                'font-size': '0.95rem',
                                'font-weight': '600',
                                color: '#2d3748',
                                transition: 'all 0.2s',
                                outline: 'none',
                                ...(isDisabled() ? {
                                  background: '#f7fafc',
                                  cursor: 'not-allowed',
                                  color: '#a0aec0'
                                } : {})
                              }}
                              value={entry()?.overtimeHours || 0}
                              disabled={isDisabled()}
                              onInput={(e) => {}}
                              onFocus={(e) => !isDisabled() && (e.currentTarget.style.borderColor = '#667eea')}
                              onBlur={(e) =>{
                                 e.currentTarget.style.borderColor = '#e2e8f0';
                                 handleUpdateEntry(day.key, 'overtimeHours', parseFloat(e.target.value) || 0)
                              }}
                            />
                          </td>
                      
                        </tr>
                      );
                    }}
                  </For>

                  {/* Weekly Totals */}
                  <tr style={{
                    background: 'linear-gradient(135deg, #edf2f7 0%, #e2e8f0 100%)',
                    'font-weight': '700'
                  }}>
                    <td colspan="4" style={{
                      padding: '1.25rem 1.5rem',
                      'font-size': '1rem',
                      color: '#2d3748'
                    }}>
                      📈 {t('timesheets.weeklyTotals')}
                    </td>
                    <td style={{
                      padding: '1.25rem 1.5rem',
                      'font-size': '1.1rem',
                      'font-weight': '700',
                      'text-align': 'center'
                    }}>
                      <div style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary-color)',
                        'border-radius': '0.5rem',
                        color: 'white',
                        display: 'inline-block'
                      }}>
                        {currentTimesheet()?.totalHours?.toFixed(2) || '0.00'} hrs
                      </div>
                    </td>
                    <td style={{
                      padding: '1.25rem 1.5rem',
                      'font-size': '1.1rem',
                      color: '#f59e0b',
                      'font-weight': '700'
                    }}>
                      {currentTimesheet()?.totalOvertimeHours || 0} hrs
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payroll Summary */}
          <Show when={payrollCalculation()}>
            {(payroll) => (
              <div style={{
                background: 'white',
                'border-radius': '1rem',
                'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem 2rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  'border-bottom': '1px solid #e2e8f0'
                }}>
                  <h2 style={{
                    'font-size': '1.5rem',
                    'font-weight': '700',
                    color: 'white',
                    margin: '0'
                  }}>
                    💰 {t('timesheets.payrollSummary')}
                  </h2>
                </div>

                <div style={{ padding: '2rem' }}>
                  <div style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {/* Hours Summary */}
                    <div style={{
                      border: '2px solid #e2e8f0',
                      'border-radius': '0.75rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <h3 style={{
                        'font-size': '0.875rem',
                        'font-weight': '700',
                        color: '#4a5568',
                        'margin-bottom': '1rem',
                        'text-transform': 'uppercase',
                        'letter-spacing': '0.05em'
                      }}>
                        ⏱️ {t('timesheets.hoursSummary')}
                      </h3>
                      <div style={{ 'display': 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <span style={{ color: '#718096', 'font-size': '0.95rem' }}>{t('timesheets.regularHours')}:</span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.1rem',
                            color: '#2d3748'
                          }}>
                            {payroll().regularHours.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <span style={{ color: '#718096', 'font-size': '0.95rem' }}>{t('timesheets.overtimeHours')}:</span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.1rem',
                            color: '#f59e0b'
                          }}>
                            {payroll().overtimeHours.toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          'padding-top': '0.75rem',
                          'border-top': '2px solid #cbd5e0',
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center'
                        }}>
                          <span style={{
                            'font-weight': '700',
                            color: '#2d3748',
                            'font-size': '0.95rem'
                          }}>
                            {t('timesheets.hourlyRate')}:
                          </span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.1rem',
                            color: '#667eea'
                          }}>
                            ${payroll().hourlyRate.toFixed(2)}/hr
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Pay Breakdown */}
                    <div style={{
                      border: '2px solid #e2e8f0',
                      'border-radius': '0.75rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <h3 style={{
                        'font-size': '0.875rem',
                        'font-weight': '700',
                        color: '#4a5568',
                        'margin-bottom': '1rem',
                        'text-transform': 'uppercase',
                        'letter-spacing': '0.05em'
                      }}>
                        💵 {t('timesheets.payBreakdown')}
                      </h3>
                      <div style={{ 'display': 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <span style={{ color: '#718096', 'font-size': '0.95rem' }}>{t('timesheets.regularPay')}:</span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.1rem',
                            color: '#2d3748'
                          }}>
                            ${payroll().regularPay.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                          <span style={{ color: '#718096', 'font-size': '0.95rem' }}>{t('timesheets.overtimePay')}:</span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.1rem',
                            color: '#f59e0b'
                          }}>
                            ${payroll().overtimePay.toFixed(2)}
                          </span>
                        </div>
                        <div style={{
                          'padding-top': '0.75rem',
                          'border-top': '2px solid #cbd5e0',
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center'
                        }}>
                          <span style={{
                            'font-weight': '700',
                            color: '#2d3748',
                            'font-size': '0.95rem'
                          }}>
                            {t('timesheets.totalPay')}:
                          </span>
                          <span style={{
                            'font-weight': '700',
                            'font-size': '1.25rem',
                            color: '#10b981'
                          }}>
                            ${payroll().totalPay.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions & Net Pay */}
                    <div style={{
                      border: '2px solid #e2e8f0',
                      'border-radius': '0.75rem',
                      padding: '1.5rem',
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <h3 style={{
                        'font-size': '0.875rem',
                        'font-weight': '700',
                        color: '#1e40af',
                        'margin-bottom': '1rem',
                        'text-transform': 'uppercase',
                        'letter-spacing': '0.05em'
                      }}>
                        🧾 {t('timesheets.deductionsAndNetPay')}
                      </h3>
                      <div style={{ 'display': 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                        <Show when={payroll().deductions?.taxes}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                            <span style={{ color: '#1e40af', 'font-size': '0.95rem' }}>{t('timesheets.taxes')}:</span>
                            <span style={{
                              'font-weight': '700',
                              'font-size': '1.1rem',
                              color: '#dc2626'
                            }}>
                              -${payroll().deductions!.taxes!.toFixed(2)}
                            </span>
                          </div>
                        </Show>
                        <Show when={payroll().deductions?.insurance}>
                          <div style={{ display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
                            <span style={{ color: '#1e40af', 'font-size': '0.95rem' }}>{t('timesheets.insurance')}:</span>
                            <span style={{
                              'font-weight': '700',
                              'font-size': '1.1rem',
                              color: '#dc2626'
                            }}>
                              -${payroll().deductions!.insurance!.toFixed(2)}
                            </span>
                          </div>
                        </Show>
                        <div style={{
                          'padding-top': '0.75rem',
                          'border-top': '2px solid #2563eb',
                          display: 'flex',
                          'justify-content': 'space-between',
                          'align-items': 'center'
                        }}>
                          <span style={{
                            'font-weight': '700',
                            color: '#1e3a8a',
                            'font-size': '1rem'
                          }}>
                            {t('timesheets.netPay')}:
                          </span>
                          <span style={{
                            'font-weight': '800',
                            'font-size': '1.5rem',
                            color: '#1e40af',
                            'text-shadow': '0 2px 4px rgba(30, 64, 175, 0.2)'
                          }}>
                            ${payroll().netPay.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Show>
          </Show>
        </Show>

        <Show when={!selectedEmployeeId()}>
          <div style={{
            background: 'white',
            'border-radius': '1rem',
            'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
            padding: '4rem 2rem',
            'text-align': 'center'
          }}>
            <div style={{
              'font-size': '4rem',
              'margin-bottom': '1rem',
              opacity: '0.5'
            }}>
              ⏰
            </div>
            <p style={{
              color: '#718096',
              'font-size': '1.25rem',
              'font-weight': '500'
            }}>
              {t('timesheets.selectEmployeePrompt')}
            </p>
          </div>
        </Show>
      </div>

      {/* Import CSV Modal */}
      <TimesheetImport
        isOpen={showImportModal()}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          // Reload timesheets after import
          if (selectedEmployeeId()) {
            timesheetStore.loadTimesheetsByEmployee(selectedEmployeeId());
          }
        }}
      />
    </div>
  );
};

















// Payroll Settings Panel Component
const PayrollSettingsPanel: Component<{ employeeId: string }> = (props) => {
  const { t } = useTranslation();
  const settings = createMemo(() => timesheetStore.getPayrollSettings(props.employeeId));

  const [payType, setPayType] = createSignal<'hourly' | 'salary'>(settings()?.payType || 'hourly');
  const [hourlyRate, setHourlyRate] = createSignal(settings()?.hourlyRate || 0);
  const [annualSalary, setAnnualSalary] = createSignal(settings()?.annualSalary || 0);
  const [overtimeRate, setOvertimeRate] = createSignal(settings()?.overtimeRate || 1.5);
  const [standardHours, setStandardHours] = createSignal(settings()?.standardHoursPerWeek || 40);
  const [taxRate, setTaxRate] = createSignal(settings()?.taxRate || 0);
  const [insuranceDeduction, setInsuranceDeduction] = createSignal(settings()?.insuranceDeduction || 0);



  const handleSaveSettings = () => {
    timesheetStore.setPayrollSettings(props.employeeId, {
      employeeId: props.employeeId,
      payType: payType(),
      hourlyRate: payType() === 'hourly' ? hourlyRate() : undefined,
      annualSalary: payType() === 'salary' ? annualSalary() : undefined,
      overtimeRate: overtimeRate(),
      standardHoursPerWeek: standardHours(),
      taxRate: taxRate(),
      insuranceDeduction: insuranceDeduction()
    });

    alert('✅ Payroll settings saved successfully!');
  };

  return (
    <div style={{
      background: 'white',
      'border-radius': '1rem',
      'box-shadow': '0 10px 40px rgba(0,0,0,0.15)',
      padding: '2rem',
      'margin-bottom': '1.5rem',
      border: '3px solid #667eea'
    }}>
      <h3 style={{
        'font-size': '1.5rem',
        'font-weight': '700',
        color: '#2d3748',
        'margin-bottom': '1.5rem'
      }}>
        ⚙️ {t('timesheets.payrollSettings')}
      </h3>

      <div style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        'margin-bottom': '1.5rem'
      }}>
        {/* Pay Type */}
        <div>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '600',
            color: '#4a5568',
            'margin-bottom': '0.5rem'
          }}>
            {t('timesheets.payType')}
          </label>
          <select
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              'border-radius': '0.5rem',
              'font-size': '1rem',
              'font-weight': '500',
              color: '#2d3748',
              cursor: 'pointer'
            }}
            value={payType()}
            onChange={(e) => setPayType(e.target.value as 'hourly' | 'salary')}
          >
            <option value="hourly">{t('timesheets.hourly')}</option>
            <option value="salary">{t('timesheets.salary')}</option>
          </select>
        </div>

        {/* Hourly Rate or Annual Salary */}
        <Show when={payType() === 'hourly'}>
          <div>
            <label style={{
              display: 'block',
              'font-size': '0.875rem',
              'font-weight': '600',
              color: '#4a5568',
              'margin-bottom': '0.5rem'
            }}>
              {t('timesheets.hourlyRate')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                'border-radius': '0.5rem',
                'font-size': '1rem',
                'font-weight': '600',
                color: '#2d3748'
              }}
              value={hourlyRate()}
              onInput={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
            />
          </div>
        </Show>

        <Show when={payType() === 'salary'}>
          <div>
            <label style={{
              display: 'block',
              'font-size': '0.875rem',
              'font-weight': '600',
              color: '#4a5568',
              'margin-bottom': '0.5rem'
            }}>
              {t('timesheets.annualSalary')}
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                'border-radius': '0.5rem',
                'font-size': '1rem',
                'font-weight': '600',
                color: '#2d3748'
              }}
              value={annualSalary()}
              onInput={(e) => setAnnualSalary(parseFloat(e.target.value) || 0)}
            />
          </div>
        </Show>

        {/* Standard Hours Per Week */}
        <div>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '600',
            color: '#4a5568',
            'margin-bottom': '0.5rem'
          }}>
            {t('timesheets.standardHoursPerWeek')}
          </label>
          <input
            type="number"
            min="0"
            max="168"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              'border-radius': '0.5rem',
              'font-size': '1rem',
              'font-weight': '600',
              color: '#2d3748'
            }}
            value={standardHours()}
            onInput={(e) => setStandardHours(parseFloat(e.target.value) || 40)}
          />
        </div>

        {/* Overtime Rate */}
        <div>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '600',
            color: '#4a5568',
            'margin-bottom': '0.5rem'
          }}>
            {t('timesheets.overtimeMultiplier')}
          </label>
          <input
            type="number"
            min="1"
            step="0.1"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              'border-radius': '0.5rem',
              'font-size': '1rem',
              'font-weight': '600',
              color: '#2d3748'
            }}
            value={overtimeRate()}
            onInput={(e) => setOvertimeRate(parseFloat(e.target.value) || 1.5)}
          />
          <p style={{
            'font-size': '0.75rem',
            color: '#718096',
            'margin-top': '0.25rem'
          }}>
            Default: 1.5 (time-and-a-half)
          </p>
        </div>

        {/* Tax Rate */}
        <div>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '600',
            color: '#4a5568',
            'margin-bottom': '0.5rem'
          }}>
            {t('timesheets.taxRate')}
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              'border-radius': '0.5rem',
              'font-size': '1rem',
              'font-weight': '600',
              color: '#2d3748'
            }}
            value={taxRate()}
            onInput={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          />
        </div>

        {/* Insurance Deduction */}
        <div>
          <label style={{
            display: 'block',
            'font-size': '0.875rem',
            'font-weight': '600',
            color: '#4a5568',
            'margin-bottom': '0.5rem'
          }}>
            {t('timesheets.insuranceDeduction')}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '2px solid #e2e8f0',
              'border-radius': '0.5rem',
              'font-size': '1rem',
              'font-weight': '600',
              color: '#2d3748'
            }}
            value={insuranceDeduction()}
            onInput={(e) => setInsuranceDeduction(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <button
        style={{
          padding: '0.875rem 2rem',
          background: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          'border-radius': '0.5rem',
          'font-weight': '700',
          'font-size': '1rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
          'box-shadow': '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}
        onClick={handleSaveSettings}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
      >
        💾 {t('timesheets.savePayrollSettings')}
      </button>
    </div>
  );
};

export default Timesheets;
