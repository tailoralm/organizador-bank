import { Injectable } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import PdfParserActivobankService from './pdf-parser-activobank.service';

// Configure PDF.js worker - using local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface Transaction {
  date: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface Word {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface ColumnConfig {
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
  private readonly headerRegex =
    /data\s+lanc\.?\s+data\s+valor.*descritivo.*debito.*credito.*saldo/i;
  private readonly footerRegex = /\bsaldo final\b/i;
  private readonly dateRegex = /\d{2}\.\d{2}/;

  private readonly satatementExtractor = new PdfParserActivobankService();

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
              page: pageNum,
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

  private groupRows(words: Word[], tolerance = 4): Map<number, Word[]> {
    const rows = new Map<number, Word[]>();
    const marginToIgnore = this.satatementExtractor.marginToIgnore();
    const pageOffset = 1000; // Large offset to separate pages

    for (const word of words) {
      if (word.x < marginToIgnore) continue;

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
    const headerKeywords = this.satatementExtractor.headerKeywords();

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
        for (const keyword of headerKeywords) {
          if (rowText.includes(keyword)) {
            countKeys++;
          }
        }
        if (countKeys === headerKeywords.length) {
          columns = this.satatementExtractor.columnsConfig(rowWords);
          continue;
        } else {
          continue;
        }
      }

      const row = this.satatementExtractor.extractDataFromRow(rowWords, columns);

      if (row.description.includes('A TRANSPORTAR')) {
        // End of transactions in this page
        columns = null;
        continue;
      }

      const dateCandidates: string[] = row.date?.split(' ') || [];

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

      // Skip rows that dont have debit or credit (both empty) or both filled
      if ((!row.debit.trim() && !row.credit.trim()) || (row.debit.trim() && row.credit.trim())) {
        continue;
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
