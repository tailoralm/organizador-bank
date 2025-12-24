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
            if (word.text === 'JUROS' || word.text === 'legislação' || word.text === '10.30') {
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

  private groupRows(words: Word[], tolerance: number = 4): Map<number, Word[]> {
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
          // Only add if it looks like a number (digits, dots, commas, spaces)
          if (/^[\d.,\s]+$/.test(text)) {
            row.debit += text;
          }
        } else if (x >= columns.credit[0] && x < columns.credit[1]) {
          // Only add if it looks like a number
          if (/^[\d.,\s]+$/.test(text)) {
            row.credit += text;
          }
        } else if (x >= columns.balance[0] && x < columns.balance[1]) {
          // Only add if it looks like a number
          if (/^[\d.,\s]+$/.test(text)) {
            row.balance += text;
          }
        }
      }

      // Row filtering - must have valid date
      if (!dateCandidates.some((d) => this.dateRegex.test(d))) {
        continue;
      }

      // Extract and validate date format (must be exactly XX.XX)
      const dateText = dateCandidates.length > 0 ? dateCandidates[0] : '';
      let extractedDate = '';
      if (dateText.includes(' ')) {
        const dates = dateText.trim().split(/\s+/);
        extractedDate = dates.length > 1 ? dates[1] : dates[0];
      } else {
        extractedDate = dateText;
      }

      // Date must be exactly in format XX.XX (not "DE", "PRODUTO", etc.)
      if (!/^\d{2}\.\d{2}$/.test(extractedDate)) {
        continue;
      }

      // Skip non-transaction rows with header/info keywords
      const descLower = row.description.toLowerCase();
      const debitLower = row.debit.toLowerCase();
      const creditLower = row.credit.toLowerCase();
      const allText = (descLower + ' ' + debitLower + ' ' + creditLower).toLowerCase();

      if (
        descLower.includes('saldo inicial') ||
        descLower.includes('capital social') ||
        descLower.includes('matric') ||
        descLower.includes('data lanc') ||
        descLower.includes('descritivo') ||
        allText.includes('debito') ||
        allText.includes('credito') ||
        allText.includes('produto') ||
        allText.includes('montante') ||
        allText.includes('moeda') ||
        allText.includes('vencimento') ||
        creditLower.includes('data') ||
        debitLower.includes('montante')
      ) {
        continue;
      }

      // Skip rows without description or balance
      if (!row.description.trim() || !row.balance.trim()) {
        continue;
      }

      // Validate that balance contains only numeric characters
      const balanceClean = row.balance.replace(/[\s,]/g, '');
      if (!/^\d+\.?\d*$/.test(balanceClean)) {
        continue;
      }

      // If debit has value, validate it's numeric
      if (row.debit.trim()) {
        const debitClean = row.debit.replace(/[\s,]/g, '');
        if (!/^\d+\.?\d*$/.test(debitClean)) {
          continue;
        }
      }

      // If credit has value, validate it's numeric
      if (row.credit.trim()) {
        const creditClean = row.credit.replace(/[\s,]/g, '');
        if (!/^\d+\.?\d*$/.test(creditClean)) {
          continue;
        }
      }

      // Set the validated date
      row.date = extractedDate;

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
