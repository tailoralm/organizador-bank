import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - using local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface Transaction {
  date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

interface Word {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColumnConfig {
  date1: [number, number];
  date2: [number, number];
  description: [number, number];
  debit: [number, number];
  credit: [number, number];
  balance: [number, number];
}

@Injectable({
  providedIn: 'root',
})
export class PdfParserService {
  private readonly patterns: { [key: string]: ColumnConfig } = {
    activobank: {
      date1: [50, 110], // Both dates together "11.03 11.03"
      date2: [0, 0], // Not used - dates are together
      description: [110, 355], // Transaction description
      debit: [355, 420], // Debit amounts
      credit: [420, 518], // Credit amounts
      balance: [518, 600], // Balance values
    },
  };

  private readonly headerRegex =
    /data\s+lanc\.?\s+data\s+valor.*descritivo.*debito.*credito.*saldo/i;
  private readonly footerRegex = /\bsaldo final\b/i;
  private readonly dateRegex = /\d{2}\.\d{2}/;

  async parsePdf(file: File, pattern: string): Promise<Transaction[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const words = await this.extractTransactionWords(pdf);
    const transactions = this.parseTransactions(words, pattern);

    return transactions;
  }

  private async extractTransactionWords(pdf: pdfjsLib.PDFDocumentProxy): Promise<Word[]> {
    let collecting = false;
    const collectedWords: Word[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Check for header and footer
      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      console.log(`Page ${pageNum} text: ${pageText}`);

      if (!collecting && this.headerRegex.test(pageText)) {
        collecting = true;
      }

      if (collecting) {
        // Extract words with positions
        for (const item of textContent.items) {
          const textItem = item as any;
          if (textItem.str.trim()) {
            const word = {
              text: textItem.str,
              x: textItem.transform[4],
              y: textItem.transform[5],
              width: textItem.width,
              height: textItem.height,
            };
            collectedWords.push(word);

            // Log first 50 words to help debug column positions
            if (collectedWords.length <= 50) {
              console.log(`Word: "${word.text}" at X=${word.x.toFixed(2)}, Y=${word.y.toFixed(2)}`);
            }
          }
        }
      }

      if (collecting && this.footerRegex.test(pageText)) {
        break;
      }
    }

    if (collectedWords.length === 0) {
      throw new Error('Transaction table not found in PDF');
    }

    return collectedWords;
  }

  private groupRows(words: Word[], tolerance: number = 3): Map<number, Word[]> {
    const rows = new Map<number, Word[]>();

    for (const word of words) {
      const key = Math.round(word.y / tolerance) * tolerance;
      if (!rows.has(key)) {
        rows.set(key, []);
      }
      rows.get(key)!.push(word);
    }

    return rows;
  }

  private parseTransactions(words: Word[], pattern: string): Transaction[] {
    const columns = this.patterns[pattern];
    if (!columns) {
      throw new Error(`Unknown pattern: ${pattern}`);
    }

    const rows = this.groupRows(words);
    const transactions: Transaction[] = [];

    for (const [_, rowWords] of rows) {
      // Sort words by x position
      rowWords.sort((a, b) => a.x - b.x);

      const row: Transaction = {
        date: '',
        description: '',
        debit: '',
        credit: '',
        balance: '',
      };

      const dateCandidates: string[] = [];

      for (const word of rowWords) {
        const x = word.x;
        const text = word.text;

        if (x >= columns.date1[0] && x < columns.date1[1]) {
          // Dates come together like "11.03 11.03", extract the second one (valor date)
          dateCandidates.push(text);
        } else if (x >= columns.description[0] && x < columns.description[1]) {
          row.description += ' ' + text;
        } else if (x >= columns.debit[0] && x < columns.debit[1]) {
          row.debit += text;
        } else if (x >= columns.credit[0] && x < columns.credit[1]) {
          row.credit += text;
        } else if (x >= columns.balance[0] && x < columns.balance[1]) {
          row.balance += text;
        }
      }

      // Row filtering
      if (!dateCandidates.some((d) => this.dateRegex.test(d))) {
        continue;
      }

      // Skip non-transaction rows
      const descLower = row.description.toLowerCase();
      if (
        descLower.includes('saldo inicial') ||
        descLower.includes('capital social') ||
        descLower.includes('matric') ||
        descLower.includes('data lanc') ||
        descLower.includes('descritivo') ||
        descLower.includes('debito') ||
        descLower.includes('credito')
      ) {
        continue;
      }

      // Skip rows without description or balance
      if (!row.description.trim() || !row.balance.trim()) {
        continue;
      }

      // Use second date if present, otherwise first
      row.date = dateCandidates.length > 1 ? dateCandidates[1] : dateCandidates[0];
      // Dates come as "11.03 11.03" - extract the second date (valor)
      const dateText = dateCandidates.length > 0 ? dateCandidates[0] : '';
      if (dateText.includes(' ')) {
        // Extract second date from "11.03 11.03"
        const dates = dateText.trim().split(/\s+/);
        row.date = dates.length > 1 ? dates[1] : dates[0];
      } else {
        row.date = dateText;
      }
      // Trim all values
      transactions.push({
        date: row.date.trim(),
        description: row.description.trim(),
        debit: row.debit.trim(),
        credit: row.credit.trim(),
        balance: row.balance.trim(),
      });
    }

    if (transactions.length === 0) {
      throw new Error('No transactions parsed - adjust column ranges or check PDF format');
    }

    return transactions;
  }
}
