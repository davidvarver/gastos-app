import jsPDF from 'jspdf';
import { Transaction } from '@/db/db';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ReportData {
    month: string;
    monthYear: string;
    income: number;
    expense: number;
    net: number;
    maaser: number;
    transactions: (Transaction & { categoryName?: string })[];
    topCategories: { name: string; amount: number }[];
    averageDaily: number;
}

export async function generateMonthlyReport(data: ReportData) {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 15;

    // HEADER
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('💰 Reporte de Gastos', pageWidth / 2, 12, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.month, pageWidth / 2, 22, { align: 'center' });

    yPosition = 40;

    // RESUMEN EJECUTIVO
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumen Ejecutivo', 15, yPosition);
    yPosition += 12;

    const cardWidth = (pageWidth - 45) / 2;
    const cardHeight = 22;
    const cards = [
        { title: 'Ingresos', amount: data.income, r: 34, g: 197, b: 94 },
        { title: 'Gastos', amount: data.expense, r: 239, g: 68, b: 68 },
        { title: 'Neto', amount: data.net, r: 59, g: 130, b: 246 },
        { title: 'Maaser (10%)', amount: data.maaser, r: 168, g: 85, b: 247 }
    ];

    let cardIndex = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const card = cards[cardIndex++];
            const xPos = 15 + j * (cardWidth + 15);

            pdf.setFillColor(card.r, card.g, card.b);
            pdf.rect(xPos, yPosition, cardWidth, cardHeight, 'F');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'normal');
            pdf.text(card.title, xPos + 5, yPosition + 8);

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(formatCurrency(card.amount), xPos + 5, yPosition + 16);
        }
        yPosition += cardHeight + 8;
    }

    yPosition += 5;

    // TOP CATEGORÍAS
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Top Categorías', 15, yPosition);
    yPosition += 8;

    data.topCategories.slice(0, 5).forEach(cat => {
        const barWidth = (pageWidth - 60) * (cat.amount / data.expense) || 0;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(30, 30, 30);
        pdf.text(cat.name, 15, yPosition + 5);

        pdf.setFillColor(59, 130, 246);
        pdf.rect(50, yPosition + 2, barWidth, 6, 'F');

        pdf.setTextColor(30, 30, 30);
        pdf.text(formatCurrency(cat.amount), pageWidth - 20, yPosition + 5, { align: 'right' });
        yPosition += 10;
    });

    yPosition += 5;

    // TABLA DE TRANSACCIONES
    if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = 15;
    }

    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Transacciones', 15, yPosition);
    yPosition += 8;

    pdf.setFillColor(245, 245, 245);
    pdf.rect(15, yPosition - 3, pageWidth - 30, 6, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text('Fecha', 16, yPosition + 1);
    pdf.text('Descripción', 35, yPosition + 1);
    pdf.text('Categoría', 100, yPosition + 1);
    pdf.text('Monto', pageWidth - 20, yPosition + 1, { align: 'right' });

    yPosition += 8;

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');

    const maxRows = 25;
    data.transactions.slice(0, maxRows).forEach(tx => {
        if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = 15;
        }

        const dateStr = format(
            typeof tx.date === 'string' ? new Date(tx.date) : tx.date,
            'dd/MM/yyyy'
        );

        pdf.setTextColor(30, 30, 30);
        pdf.text(dateStr, 16, yPosition);
        pdf.text(tx.description.substring(0, 30), 35, yPosition);
        pdf.text(tx.categoryName || '—', 100, yPosition);
        pdf.text(formatCurrency(tx.amount), pageWidth - 20, yPosition, { align: 'right' });
        yPosition += 5;
    });

    if (data.transactions.length > maxRows) {
        yPosition += 2;
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`... y ${data.transactions.length - maxRows} transacciones más`, 15, yPosition);
    }

    // FOOTER
    yPosition = pageHeight - 10;
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
    );

    const fileName = `Reporte-Gastos-${data.monthYear}.pdf`;
    pdf.save(fileName);
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}
