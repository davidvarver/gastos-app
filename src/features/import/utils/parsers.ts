import Papa from 'papaparse';

export interface RawTransaction {
    date: string;
    description: string;
    amount: number;
    originalLine: any;
}

export interface ImportResult {
    transactions: RawTransaction[];
    errors: string[];
}

export async function parseCSV(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const transactions: RawTransaction[] = [];
                const errors: string[] = [];

                // Detect format based on headers
                const headers = results.meta.fields || [];
                const isAmex = headers.some(h => h.toLowerCase().includes('referencia') && h.toLowerCase().includes('monto'));
                // Note: Amex Mexico often has 'Fecha', 'Referencia', 'Descripción', 'Monto', 'Divisa'
                // Or sometimes just generic headers. Let's look for specific Amex patterns or user selection later.
                // For now, simple heuristic: if negative amounts look like payments, it's normal. 
                // If positive amounts are payments (Amex style sometimes), we need to invert.
                // User requirement: "amex... -10000 son entradas y 10000 son salidas"
                // Standard: -10000 usually means money leaving account (expense).
                // User says: "-10000 son entradas" (Income/Payment) and "10000 son salidas" (Expense).
                // So Amex CSV has positive for expenses?
                // Let's assume we need a toggle or auto-detect.

                results.data.forEach((row: any) => {
                    try {
                        // Normalize Date
                        // Try common formats
                        let dateStr = row['Fecha'] || row['Date'] || row['FECHA'];
                        // Simple date parsing (improve later with date-fns)

                        // Normalize Description
                        let description = row['Descripción'] || row['Description'] || row['Concepto'] || row['CONCEPTO'] || 'Sin descripción';

                        // Normalize Amount
                        let amountStr = row['Monto'] || row['Amount'] || row['Importe'] || row['IMPORTE'];
                        if (!amountStr) return;

                        // Clean currency symbols
                        let amount = parseFloat(amountStr.toString().replace(/[$,]/g, ''));

                        if (isNaN(amount)) return;

                        transactions.push({
                            date: dateStr,
                            description,
                            amount,
                            originalLine: row
                        });
                    } catch (e) {
                        errors.push(`Error parsing row: ${JSON.stringify(row)}`);
                    }
                });

                resolve({ transactions, errors });
            },
            error: (error) => {
                resolve({ transactions: [], errors: [error.message] });
            }
        });
    });
}
