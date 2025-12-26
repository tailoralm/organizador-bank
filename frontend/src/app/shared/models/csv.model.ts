/**
 * CSV Data structure with headers and rows
 */
export interface CsvData {
  headers: string[];
  rows: string[][];
}

/**
 * Generic CSV row with dynamic columns
 */
export interface CsvRow {
  [key: string]: string | number | boolean;
}

/**
 * Cashew app transaction format
 */
export interface CashewTransaction extends CsvRow {
  Date: string; // format: DD/MM/YYYY HH:MM:SS
  Amount: string; // format: 1234.56 (positive for income, negative for expense)
  Category: string;
  Title: string;
  Note: string;
  Account: string;
}
