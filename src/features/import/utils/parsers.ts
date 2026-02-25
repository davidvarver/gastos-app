import Papa from 'papaparse';

export interface RawTransaction {
    date: string;
    description: string;
    amount: number;
    cardholder?: string;
    originalLine: unknown;
}

export interface ImportResult {
    transactions: RawTransaction[];
    errors: string[];
    headers?: string[];
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
                console.log("CSV Headers Detected:", headers);
                if (results.data.length > 0) {
                    console.log("First Row Sample:", results.data[0]);
                }

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

                // Helper to find value by fuzzy header match
                const getColumnValue = (row: Record<string, unknown>, possibleHeaders: string[]): unknown => {
                    const rowKeys = Object.keys(row);
                    for (const header of possibleHeaders) {
                        // 1. Exact match
                        if (row[header] !== undefined) return row[header];

                        // 2. Case insensitive match
                        const key = rowKeys.find(k => k.toLowerCase() === header.toLowerCase());
                        if (key) return row[key];

                        // 3. Partial match (if header is long enough to be specific)
                        if (header.length > 4) {
                            const partialKey = rowKeys.find(k => k.toLowerCase().includes(header.toLowerCase()));
                            if (partialKey) return row[partialKey];
                        }
                    }
                    return undefined;
                };

                (results.data as Array<Record<string, unknown>>).forEach((row) => {
                    try {
                        // Normalize Date
                        let dateStr = getColumnValue(row, ['Fecha', 'Date', 'FECHA']);

                        // Normalize Description
                        // Add 'Descripci' to catch 'DescripciÃ³n' encoding errors
                        let description = getColumnValue(row, ['Descripción', 'Description', 'Concepto', 'CONCEPTO', 'Descripci']) || 'Sin descripción';

                        // Normalize Amount
                        let amountStr = getColumnValue(row, ['Monto', 'Amount', 'Importe', 'IMPORTE']);
                        if (!amountStr) return;

                        // Clean currency symbols
                        let amount = parseFloat(String(amountStr).replace(/[$,]/g, ''));

                        if (isNaN(amount)) return;

                        // Normalize Cardholder
                        // Added 'Titular de la Tarjeta' specifically for Amex
                        let cardholder = getColumnValue(row, ['Tarjetahabiente', 'Cardholder', 'Titular de la Tarjeta', 'Titular', 'Nombre']);

                        transactions.push({
                            date: String(dateStr),
                            description: String(description),
                            amount,
                            cardholder: cardholder ? String(cardholder) : undefined,
                            originalLine: row
                        });
                    } catch (e) {
                        errors.push(`Error parsing row: ${JSON.stringify(row)}`);
                    }
                });

                resolve({ transactions, errors, headers });
            },
            error: (error) => {
                resolve({ transactions: [], errors: [error.message] });
            }
        });
    });
}
