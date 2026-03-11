import { createStore } from 'solid-js/store';
import { expenseEventIntegration } from '../../events/integrations/expenseIntegration';

// Types
export interface Expense {
    id: string;
    category: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    vendorId?: string;
    employeeId?: string;
    paymentMethod?: string;
    reference?: string;
    receipt?: string;
    taxAmount?: number;
    approvedBy?: string;
    approvedDate?: string;
    paidDate?: string;
}

// Mock API (Replace with actual API calls when backend is ready)
const expenseApi = {
    async create(data: any): Promise<Expense> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
            ...data,
            id: `exp-${Date.now()}`,
            status: data.status || 'pending',
            currency: data.currency || 'USD'
        };
    },

    async update(id: string, data: any): Promise<Expense> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { ...data, id };
    },

    async delete(id: string): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    },

    async getAll(): Promise<Expense[]> {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [];
    }
};

// Store State
const [state, setState] = createStore({
    expenses: [] as Expense[],
    loading: false,
    error: null as string | null
});

export const expenseStore = {
    get state() { return state; },
    get expenses() { return state.expenses; },

    async fetchExpenses() {
        try {
            setState('loading', true);
            const expenses = await expenseApi.getAll();
            setState('expenses', expenses);
            return expenses;
        } catch (error) {
            setState('error', error instanceof Error ? error.message : 'Failed to fetch expenses');
            throw error;
        } finally {
            setState('loading', false);
        }
    },

    async createExpense(expenseData: any) {
        try {
            setState('loading', true);
            const expense = await expenseApi.create(expenseData);

            setState('expenses', prev => [expense, ...prev]);

            // Emit expense creation event
            await expenseEventIntegration.onExpenseCreated(expense);

            return expense;
        } catch (error) {
            setState('error', error instanceof Error ? error.message : 'Failed to create expense');
            throw error;
        } finally {
            setState('loading', false);
        }
    },

    async approveExpense(expenseId: string, approverName: string) {
        try {
            setState('loading', true);
            const expense = state.expenses.find(e => e.id === expenseId);
            if (!expense) throw new Error('Expense not found');

            const updates = {
                ...expense,
                status: 'approved' as const,
                approvedDate: new Date().toISOString(),
                approvedBy: approverName
            };

            const updated = await expenseApi.update(expenseId, updates);

            setState('expenses', (e) => e.id === expenseId, updated);

            // Emit approval event
            await expenseEventIntegration.onExpenseApproved(updated);

            return updated;
        } catch (error) {
            setState('error', error instanceof Error ? error.message : 'Failed to approve expense');
            throw error;
        } finally {
            setState('loading', false);
        }
    },

    async payExpense(expenseId: string) {
        try {
            setState('loading', true);
            const expense = state.expenses.find(e => e.id === expenseId);
            if (!expense) throw new Error('Expense not found');

            const updates = {
                ...expense,
                status: 'paid' as const,
                paidDate: new Date().toISOString()
            };

            const updated = await expenseApi.update(expenseId, updates);

            setState('expenses', (e) => e.id === expenseId, updated);

            // Emit paid event
            await expenseEventIntegration.onExpensePaid(updated);

            return updated;
        } catch (error) {
            setState('error', error instanceof Error ? error.message : 'Failed to pay expense');
            throw error;
        } finally {
            setState('loading', false);
        }
    }
};
