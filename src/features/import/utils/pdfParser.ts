import * as pdfjsLib from 'pdfjs-dist';
import { type RawTransaction } from './parsers';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function parsePDF(file: File): Promise<RawTransaction[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: RawTransaction[] = [];

    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            if (textContent.items.length === 0) {
                console.warn(`Page ${i} has no text content. It might be an image scan.`);
                continue;
            }

            const textItems = textContent.items.map((item: any) => item.str);
            const fullText = textItems.join(' ');

            // Yield to main thread to avoid freezing UI
            await new Promise(resolve => setTimeout(resolve, 0));

            // Expanded Regex to find dates: 
            // 1. DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
            // 2. DD MMM YYYY (e.g. 01 Jan 2023 or 01 Ene 2023)
            const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Ene|Abr|Ago|Dic";
            const dateRegex = new RegExp(`(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+(?:${months})[a-z]*\\s+\\d{2,4})`, 'gi');

            // Find all date matches first to avoid repeated slicing/searching
            const dateMatches = Array.from(fullText.matchAll(dateRegex));

            for (let j = 0; j < dateMatches.length; j++) {
                const match = dateMatches[j];
                const dateStr = match[0];
                const startIndex = match.index;

                // End index is the start of the next date match, or end of text
                const nextMatch = dateMatches[j + 1];
                const endIndex = nextMatch ? nextMatch.index : fullText.length;

                const lineContent = fullText.slice(startIndex, endIndex);

                // Amount Regex: 
                // Support currency symbols, negative signs with spaces, and standard decimal formats
                // Matches: $1,234.56 | - 1.234,56 | 1234.56
                const amountRegex = /(-?\s*[$€£]?\s*[\d,]+\.\d{2})|(-?\s*[$€£]?\s*[\d.]+\,\d{2})/;
                const amountMatch = lineContent.match(amountRegex);

                if (amountMatch) {
                    // Clean up amount string: remove currency symbols, spaces, and normalize separators
                    let amountStr = amountMatch[0]
                        .replace(/[$€£\s]/g, '') // Remove symbols and spaces
                        .replace(/,(\d{2})$/, '.$1') // Replace comma decimal separator with dot if at end
                        .replace(/[.,](?=\d{3})/g, ''); // Remove thousand separators (dots or commas)

                    // Final cleanup for standard US format (remove remaining commas if any)
                    if (amountStr.includes(',')) amountStr = amountStr.replace(/,/g, '');

                    const amount = parseFloat(amountStr);

                    // Description is everything between date and amount
                    // Also remove the amount string from the line to get description
                    const description = lineContent
                        .replace(dateStr, '')
                        .replace(amountMatch[0], '')
                        .replace(/\s+/g, ' ') // Normalize spaces
                        .trim();

                    if (!isNaN(amount) && description.length > 0) {
                        transactions.push({
                            date: dateStr,
                            description: description,
                            amount: amount,
                            originalLine: lineContent.trim()
                        });
                    }
                }
            }
        }

        if (transactions.length === 0) {
            throw new Error("No se encontraron transacciones. Es posible que el PDF sea una imagen escaneada o tenga un formato no soportado.");
        }

        return transactions;

    } catch (error: any) {
        console.error("PDF Parsing Error:", error);
        throw new Error(error.message || "Error al leer el archivo PDF.");
    }
}
