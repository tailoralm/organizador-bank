import { ColumnConfig, Transaction, Word } from './pdf-parser.service';

export default class PdfParserActivobankService {
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

      if (x >= columns.date1[0] && x < columns.date2[1]) {
        // Dates come together like "11.03 11.03", extract the second one (valor date)
        row.date += text;
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

  headerKeywords(): string[] {
    return ['lanc.', 'valor', 'descritivo', 'debito', 'credito', 'saldo'];
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

  marginToIgnore(): number {
    return 50; // Ignore words within 50 units of the page edges
  }

  private isNumber(text: string): boolean {
    return /^[\d.,\s]+$/.test(text);
  }
}
