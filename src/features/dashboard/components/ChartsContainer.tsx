import { ExpensesPieChart } from './ExpensesPieChart';
import { IncomeVsExpenseChart } from './IncomeVsExpenseChart';

interface ChartsContainerProps {
    currentDate: Date;
    onMonthClick?: (date: Date) => void;
    accountId?: string;
    cardholder?: string;
}

export function ChartsContainer({ currentDate, onMonthClick, accountId, cardholder }: ChartsContainerProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <IncomeVsExpenseChart onMonthClick={onMonthClick} accountId={accountId} cardholder={cardholder} />
            <ExpensesPieChart currentDate={currentDate} accountId={accountId} cardholder={cardholder} />
        </div>
    );
}
