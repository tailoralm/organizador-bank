import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import { Transaction, Word, ColumnConfig } from '../../shared/models/transaction.model';

// Configure PDF.js worker - using local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export abstract class PdfParserService {
  protected abstract headerKeywords: string[];
  protected abstract marginToIgnore: number;
  protected abstract readonly headerRegex: RegExp;
  protected abstract readonly footerRegex: RegExp;
  protected abstract readonly dateRegex: RegExp;

  abstract columnsConfig(words: Word[]): ColumnConfig;
  abstract extractDataFromRow(rowWords: Word[], columns: ColumnConfig): Transaction;
  abstract isEndOfPage(row: Transaction): boolean;

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
              page: pageNum,
            };
            collectedWords.push(word);
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

  private groupRows(words: Word[], tolerance = 4): Map<number, Word[]> {
    const rows = new Map<number, Word[]>();
    const pageOffset = 1000; // Large offset to separate pages

    for (const word of words) {
      if (word.x < this.marginToIgnore) continue;

      word.y += (word.page - 1) * pageOffset;
      let foundKey: number | null = null;

      for (const key of rows.keys()) {
        if (Math.abs(key - word.y) <= tolerance) {
          foundKey = key;
          break;
        }
      }

      if (foundKey === null) {
        rows.set(word.y, [word]);
      } else {
        rows.get(foundKey)!.push(word);
      }
    }

    return rows;
  }

  private parseTransactions(words: Word[], pattern: string): Transaction[] {
    let columns: ColumnConfig | null = null;

    const rows = this.groupRows(words);
    const transactions: Transaction[] = [];

    for (const [_, rowWords] of rows) {
      // Sort words by x position
      rowWords.sort((a, b) => a.x - b.x);

      // Find header
      if (!columns) {
        const rowText = rowWords.map((w) => w.text.toLowerCase()).join(' ');
        let countKeys = 0;
        for (const keyword of this.headerKeywords) {
          if (rowText.includes(keyword)) {
            countKeys++;
          }
        }
        if (countKeys === this.headerKeywords.length) {
          columns = this.columnsConfig(rowWords);
          continue;
        } else {
          continue;
        }
      }

      const row = this.extractDataFromRow(rowWords, columns);

      if (this.isEndOfPage(row)) {
        // End of transactions in this page
        columns = null;
        continue;
      }

      if (!row.date) {
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

      // If value has value, validate it's numeric, it can be negative
      if (row.value.trim()) {
        const valueClean = row.value.replace(/[\s,]/g, '');
        if (!/^-?\d+\.?\d*$/.test(valueClean)) {
          continue;
        }
      }

      // Trim all values
      transactions.push({
        date: row.date.trim(),
        description: row.description.trim(),
        value: row.value.trim(),
        balance: row.balance.trim(),
      });
    }

    if (transactions.length === 0) {
      throw new Error('No transactions parsed - adjust column ranges or check PDF format');
    }

    return transactions;
  }
}
