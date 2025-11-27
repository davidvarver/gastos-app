import * as pdfjsLib from 'pdfjs-dist';
import { type RawTransaction } from './parsers';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePDF(file: File): Promise<RawTransaction[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: RawTransaction[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map((item: any) => item.str);

        // Basic heuristic parsing
        // We look for lines that might contain a date, description, and amount.
        // This is highly dependent on the bank statement format.
        // For now, we'll try to reconstruct lines and regex match.

        // Strategy: Join all text and split by newlines (if PDF structure allows) 
        // or try to group items by Y position (more complex).
        // Simple approach: Join everything with spaces and try to find patterns.

        const fullText = textItems.join(' ');

        // Regex for common date formats (DD/MM/YYYY, YYYY-MM-DD, etc)
        // and amounts (1,234.56 or 1.234,56)

        // Example Pattern: Date ... Description ... Amount
        // This is very brittle. A better approach for "generic" PDF is hard.
        // Let's try to find "Date-like" strings and assume they start a transaction.

        // Regex to find dates: \d{2}[/-]\d{2}[/-]\d{2,4}
        const dateRegex = /(\d{2}[/-]\d{2}[/-]\d{2,4})/g;

        let match;
        while ((match = dateRegex.exec(fullText)) !== null) {
            const dateStr = match[0];
            const startIndex = match.index;

            // Look ahead for the next date to define the "end" of this transaction line
            const nextDateMatch = fullText.slice(startIndex + dateStr.length).match(dateRegex);
            const endIndex = nextDateMatch ? startIndex + dateStr.length + nextDateMatch.index! : fullText.length;

            const lineContent = fullText.slice(startIndex, endIndex);

            // Extract Amount (last number in the line usually)
            // Matches: 1,234.56 or -1234.56
            const amountRegex = /(-?[\d,]+\.\d{2})|(-?[\d.]+\,\d{2})/;
            const amountMatch = lineContent.match(amountRegex);

            if (amountMatch) {
                const amountStr = amountMatch[0].replace(/,/g, ''); // Simple cleanup, assumes US format for now
                const amount = parseFloat(amountStr);

                // Description is everything between date and amount
                const description = lineContent
                    .replace(dateStr, '')
                    .replace(amountMatch[0], '')
                    .trim();

                if (!isNaN(amount) && description.length > 0) {
                    transactions.push({
                        date: dateStr,
                        description: description,
                        amount: amount
                    });
                }
            }
        }
    }

    return transactions;
}
