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

            // ... (rest of the parsing logic) ...

            // Yield to main thread to avoid freezing UI
            await new Promise(resolve => setTimeout(resolve, 0));

            // Regex to find dates: \d{2}[/-]\d{2}[/-]\d{2,4}
            const dateRegex = /(\d{2}[/-]\d{2}[/-]\d{2,4})/g;

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

                const amountRegex = /(-?[\d,]+\.\d{2})|(-?[\d.]+\,\d{2})/;
                const amountMatch = lineContent.match(amountRegex);

                if (amountMatch) {
                    const amountStr = amountMatch[0].replace(/,/g, '');
                    const amount = parseFloat(amountStr);
                    const description = lineContent
                        .replace(dateStr, '')
                        .replace(amountMatch[0], '')
                        .trim();

                    if (!isNaN(amount) && description.length > 0) {
                        transactions.push({
                            date: dateStr,
                            description: description,
                            amount: amount,
                            originalLine: lineContent
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
