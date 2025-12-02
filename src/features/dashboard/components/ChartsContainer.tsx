import { ExpensesPieChart } from './ExpensesPieChart';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';

interface ChartsContainerProps {
    currentDate: Date;
    onMonthClick?: (date: Date) => void;
    accountId?: string;
}

export function ChartsContainer({ currentDate, onMonthClick, accountId }: ChartsContainerProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <IncomeVsExpenseChart onMonthClick={onMonthClick} accountId={accountId} />
            <ExpensesPieChart currentDate={currentDate} accountId={accountId} />
        </div>
    );
}
