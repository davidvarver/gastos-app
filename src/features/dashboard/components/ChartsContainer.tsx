import { ExpensesPieChart } from './ExpensesPieChart';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';

export function ChartsContainer() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <IncomeVsExpenseChart />
            <ExpensesPieChart />
        </div>
    );
}
