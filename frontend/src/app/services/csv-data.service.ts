import { Injectable, signal } from '@angular/core';
import { Transaction } from './pdf-parser/pdf-parser.service';

@Injectable({
  providedIn: 'root',
})
export class CsvDataService {
  private transactions = signal<Transaction[]>([]);

  setTransactions(data: Transaction[]): void {
    this.transactions.set(data);
  }

  getTransactions(): Transaction[] {
    return this.transactions();
  }

  clearTransactions(): void {
    this.transactions.set([]);
  }

  hasTransactions(): boolean {
    return this.transactions().length > 0;
  }

  exportToCsv(): string {
    const data = this.transactions();
    if (data.length === 0) {
      return '';
    }

    // Create CSV header
    const headers = ['date', 'description', 'debit', 'credit', 'balance'];
    const csvRows = [headers.join(',')];

    // Add data rows
    for (const row of data) {
      const values = [
        row.date,
        `"${row.description.replace(/"/g, '""')}"`, // Escape quotes in description
        row.debit,
        row.credit,
        row.balance,
      ];
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  downloadCsv(filename: string = 'statement.csv'): void {
    const csvContent = this.exportToCsv();
    if (!csvContent) {
      return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
