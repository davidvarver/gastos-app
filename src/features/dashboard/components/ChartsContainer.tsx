import { ExpensesPieChart } from './ExpensesPieChart';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';

interface ChartsContainerProps {
    onMonthClick?: (date: Date) => void;
}

export function ChartsContainer({ onMonthClick }: ChartsContainerProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <IncomeVsExpenseChart onMonthClick={onMonthClick} />
            <ExpensesPieChart />
        </div>
    );
}
