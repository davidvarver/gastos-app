import * as pdfjsLib from 'pdfjs-dist';
import { RawTransaction } from './parsers';

// Configure worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface TextItem {
    str: string;
    transform: number[]; // [scaleX, skewY, skewX, scaleY, translateX, translateY]
    width: number;
    height: number;
}

export async function parsePDF(file: File): Promise<{ transactions: RawTransaction[], errors: string[] }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: RawTransaction[] = [];
    const errors: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        // Group text items by Y coordinate (row)
        // PDF coordinates start from bottom-left, so higher Y is higher up the page.
        // We'll group items that are roughly on the same Y line.
        const items = textContent.items as TextItem[];
        const rows: { y: number, text: string }[] = [];

        // Sort items by Y (descending) then X (ascending)
        items.sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) > 5) { // Tolerance of 5 units for Y
                return b.transform[5] - a.transform[5]; // Top to bottom
            }
            return a.transform[4] - b.transform[4]; // Left to right
        });

        let currentRowY = -1;
        let currentRowText = "";

        items.forEach(item => {
            if (currentRowY === -1 || Math.abs(item.transform[5] - currentRowY) > 5) {
                // New row
                if (currentRowText) {
                    rows.push({ y: currentRowY, text: currentRowText.trim() });
                }
                currentRowY = item.transform[5];
                currentRowText = item.str;
            } else {
                // Same row, append text
                // Add space if needed based on X distance? For now just space.
                currentRowText += " " + item.str;
            }
        });
        if (currentRowText) {
            rows.push({ y: currentRowY, text: currentRowText.trim() });
        }

        // Parse rows
        rows.forEach(row => {
            const line = row.text;
            // Heuristic to detect transaction lines
            // Look for Date (DD/MM/YYYY or similar) + Amount

            // Regex for Date: DD/MM/YYYY or DD-MMM-YYYY or DD MMM
            const dateRegex = /(\d{1,2}[\/\-\s](?:[A-Za-z]{3}|\d{1,2})[\/\-\s]?\d{2,4}?)/;
            // Regex for Amount: Number with commas and decimals, maybe negative sign
            const amountRegex = /(-?\$?\s?[\d,]+\.\d{2})/;

            const dateMatch = line.match(dateRegex);
            const amountMatch = line.match(amountRegex);

            if (dateMatch && amountMatch) {
                try {
                    const dateStr = dateMatch[0];
                    const amountStr = amountMatch[0].replace(/[$,\s]/g, '');
                    const amount = parseFloat(amountStr);

                    if (!isNaN(amount)) {
                        // Description is usually the text between date and amount, or around them.
                        // Let's assume description is the longest text part remaining after removing date and amount.
                        let description = line
                            .replace(dateStr, '')
                            .replace(amountMatch[0], '')
                            .trim();

                        // Clean up extra spaces
                        description = description.replace(/\s+/g, ' ');

                        // Filter out common noise
                        if (description.length > 3) {
                            transactions.push({
                                date: dateStr,
                                description: description,
                                amount: amount,
                                originalLine: line
                            });
                        }
                    }
                } catch (e) {
                    errors.push(`Error parsing line: ${line}`);
                }
            }
        });
    }

    return { transactions, errors };
}
