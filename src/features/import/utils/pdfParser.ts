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
            if (transactions.length === 0) {
                throw new Error("No se encontraron transacciones. Es posible que el PDF sea una imagen escaneada o tenga un formato no soportado.");
            }

            return transactions;

        } catch (error: any) {
            console.error("PDF Parsing Error:", error);
            throw new Error(error.message || "Error al leer el archivo PDF.");
        }
    }
