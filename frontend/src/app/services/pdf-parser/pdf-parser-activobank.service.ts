import { Injectable } from '@angular/core';
import { ColumnConfig, PdfParserService, Transaction, Word } from './pdf-parser.service';

@Injectable({
  providedIn: 'root',
})
export default class PdfParserActivobankService extends PdfParserService {
  protected headerKeywords = ['lanc.', 'valor', 'descritivo', 'debito', 'credito', 'saldo'];
  protected marginToIgnore = 50;

  protected readonly headerRegex =
    /data\s+lanc\.?\s+data\s+valor.*descritivo.*debito.*credito.*saldo/i;
  protected readonly footerRegex = /\bsaldo final\b/i;
  protected readonly dateRegex = /\d{2}\.\d{2}/;

  constructor() {
    super();
  }

  extractDataFromRow(rowWords: Word[], columns: ColumnConfig): Transaction {
    const row: Transaction = {
      date: '',
      description: '',
      debit: '',
      credit: '',
      balance: '',
    };

    for (const word of rowWords) {
      const x = word.x;
      const text = word.text;

      if (x >= columns.date1[0] && x < columns.date1[1]) {
        // get only Date Lanc.
        row.date += this.splitDate(text);
      } else if (x >= columns.date2[1] && x < columns.description[1]) {
        row.description += ' ' + text;
      } else if (x >= columns.debit[0] && x < columns.debit[1]) {
        if (this.isNumber(text)) {
          row.debit += text;
        }
      } else if (x >= columns.debit[1] && x < columns.credit[1]) {
        // After and of debit, before end of credit
        if (this.isNumber(text)) {
          row.credit += text;
        }
      } else if (x >= columns.credit[1] && x < columns.balance[1]) {
        // After end of credit, before end of balance
        if (this.isNumber(text)) {
          row.balance += text;
        }
      }
    }
    return row;
  }

  private splitDate(text: string): string {
    const parts = text.split(' ');
    const date = parts.length > 1 ? parts[0] : text;
    const splitDate = date.split('.');
    if (splitDate.length === 2) {
      return `${splitDate[1]}/${splitDate[0]}`;
    }
    return date;
  }

  columnsConfig(words: Word[]): ColumnConfig {
    // Example to start
    const columns: ColumnConfig = {
      date1: [50, 110], // Both dates together "11.03 11.03"
      date2: [0, 0], // Not used - dates are together
      description: [110, 350], // Transaction description
      debit: [350, 420], // Debit amounts
      credit: [420, 518], // Credit amounts
      balance: [518, 600], // Balance values
    };

    // Get column positions dynamically
    words.forEach((word) => {
      const text = word.text.toLowerCase();
      const wordX = Math.floor(word.x);
      if (text === 'lanc.') columns.date1 = [wordX, word.x + word.width];
      else if (text === 'valor') columns.date2 = [wordX, word.x + word.width];
      else if (text === 'descritivo') {
        columns.description[0] = wordX;
      } else if (text === 'debito') {
        const endOf = word.x + word.width;
        const startOf = Math.floor(endOf - 55); // Approximate width for debit column
        columns.debit = [startOf, endOf];
        columns.description[1] = startOf; // Adjust description end
      } else if (text === 'credito') columns.credit = [wordX, word.x + word.width];
      else if (text === 'saldo') columns.balance = [wordX, word.x + word.width];
    });

    return columns;
  }

  isEndOfPage(row: Transaction): boolean {
    return row.description.includes('A TRANSPORTAR');
  }

  private isNumber(text: string): boolean {
    return /^[\d.,\s]+$/.test(text);
  }
}
