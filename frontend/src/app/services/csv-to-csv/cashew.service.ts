import { Transaction } from '../../shared/models/transaction.model';
import { CashewTransaction } from '../../shared/models/csv.model';

export default class CashewService {
  fromTransactions(data: Transaction[]): CashewTransaction[] {
    return data.map((transaction) => {
      const date = this.formatDate(transaction.date);

      return {
        Date: date,
        Amount: transaction.value,
        Category: '',
        Title: transaction.description,
        Note: '',
        Account: '',
      };
    });
  }

  private formatDate(dateStr: string): string {
    try {
      // Try to parse the date
      const date = new Date(dateStr.split('/').reverse().join('-'));

      if (isNaN(date.getTime())) {
        // If invalid date, return current date with time
        const now = new Date();
        return this.dateToString(now);
      }

      // Set time to 00:00:00 if not present
      return this.dateToString(date);
    } catch (error) {
      return this.dateToString(new Date());
    }
  }

  private dateToString(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
