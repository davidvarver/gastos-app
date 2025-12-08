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

// Helper function to parse Spanish dates
function parseSpanishDate(dateStr: string): Date | null {
    const monthMap: { [key: string]: number } = {
        'enero': 0, 'ene': 0,
        'febrero': 1, 'feb': 1,
        'marzo': 2, 'mar': 2,
        'abril': 3, 'abr': 3,
        'mayo': 4, 'may': 4,
        'junio': 5, 'jun': 5,
        'julio': 6, 'jul': 6,
        'agosto': 7, 'ago': 7,
        'septiembre': 8, 'sep': 8,
        'octubre': 9, 'oct': 9,
        'noviembre': 10, 'nov': 10,
        'diciembre': 11, 'dic': 11,
    };

    // Robust splitting: handle " de ", " DE ", multiple spaces, etc.
    // First remove "de" if present
    const cleanStr = dateStr.toLowerCase().replace(/\s+de\s+/, ' ').trim();
    const parts = cleanStr.split(/\s+/);

    if (parts.length < 2) return null;

    const day = parseInt(parts[0], 10);
    const monthName = parts[1];
    const month = monthMap[monthName];

    if (isNaN(day) || month === undefined) return null;

    // Assume current year for now
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, month, day);

    if (date.getDate() !== day || date.getMonth() !== month) {
        return null;
    }

    return date;
}

export async function parsePDF(file: File): Promise<{ transactions: RawTransaction[], errors: string[] }> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const transactions: RawTransaction[] = [];
    const errors: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();

        const items = textContent.items as TextItem[];
        const rows: { y: number, text: string }[] = [];

        // Sort items by Y (descending) then X (ascending)
        items.sort((a, b) => {
            if (Math.abs(a.transform[5] - b.transform[5]) > 10) { // Increased tolerance to 10
                return b.transform[5] - a.transform[5];
            }
            return a.transform[4] - b.transform[4];
        });

        let currentRowY = -1;
        let currentRowText = "";

        items.forEach(item => {
            if (currentRowY === -1 || Math.abs(item.transform[5] - currentRowY) > 10) { // Increased tolerance to 10
                if (currentRowText) {
                    rows.push({ y: currentRowY, text: currentRowText.trim() });
                }
                currentRowY = item.transform[5];
                currentRowText = item.str;
            } else {
                currentRowText += " " + item.str;
            }
        });
        if (currentRowText) {
            rows.push({ y: currentRowY, text: currentRowText.trim() });
        }

        // Parse rows
        for (let j = 0; j < rows.length; j++) {
            const row = rows[j];
            let line = row.text;
            console.log("PDF Row:", line); // Debug log

            // Regex for Spanish Date: "27 de Agosto", "11 de Septiembre"
            // Also supports "27 Ago"
            const dateRegex = /(\d{1,2}\s+de\s+[A-Za-z]+|\d{1,2}\s+[A-Za-z]{3})/;

            // Regex for Amount: Number with commas and decimals, maybe negative sign
            const amountRegex = /(-?\$?\s?[\d,]+\.\d{2})/;

            let dateMatch = line.match(dateRegex);
            const amountMatch = line.match(amountRegex);
            let dateObj: Date | null = null;

            // Strategy 1: Standard single-line match
            if (dateMatch) {
                dateObj = parseSpanishDate(dateMatch[0]);
            }

            // Strategy 2: Split date (Day on this line, Month on next line)
            // Look for "DD de" at the start, but invalid month in this line
            if (!dateObj && j + 1 < rows.length) {
                const startMatch = line.match(/^(\d{1,2})\s+de\s+/i);
                if (startMatch) {
                    const nextLine = rows[j + 1].text.trim().toLowerCase();
                    // Check if next line starts with a month
                    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
                    const foundMonth = months.find(m => nextLine.startsWith(m));

                    if (foundMonth) {
                        // Construct a fake date string to parse
                        const day = startMatch[1];
                        const constructedDateStr = `${day} de ${foundMonth}`;
                        dateObj = parseSpanishDate(constructedDateStr);
                        console.log(`Merged split date: ${line} + ${foundMonth} -> ${constructedDateStr}`);
                    }
                }
            }

            if (dateObj && amountMatch) {
                try {
                    const amountStr = amountMatch[0].replace(/[$,\s]/g, '');
                    let amount = parseFloat(amountStr);

                    // Check for CR (Credit/Income indicator)
                    // It can be at the end of the line OR on the next line
                    const hasCR = /\sCR$/i.test(line.trim()) || (j + 1 < rows.length && rows[j + 1].text.trim().toUpperCase() === 'CR');

                    if (hasCR) {
                        amount = Math.abs(amount); // Income -> Positive
                    } else {
                        amount = -Math.abs(amount); // Expense -> Negative
                    }

                    if (!isNaN(amount)) {
                        const formattedDate = dateObj.toISOString().split('T')[0];

                        // Remove the date part from the description
                        // If it was a split date, we remove "DD de"
                        let description = line.replace(amountMatch[0], '').trim();

                        if (dateMatch) {
                            description = description.replace(dateMatch[0], '');
                        } else {
                            // Remove "DD de" prefix if it was a split match
                            description = description.replace(/^(\d{1,2})\s+de\s+/i, '');
                        }

                        // Remove CR from description if present
                        description = description.replace(/\sCR$/i, '');

                        description = description.trim().replace(/\s+/g, ' ');

                        if (description.length > 3 && !description.toLowerCase().includes('saldo anterior')) {
                            transactions.push({
                                date: formattedDate,
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
        }
    }

    return { transactions, errors };
}
