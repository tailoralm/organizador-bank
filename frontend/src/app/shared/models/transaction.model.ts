/**
 * Transaction model representing a financial transaction
 */
export interface Transaction {
  date: string;
  description: string;
  value: string;
  balance: string;
  [key: string]: string | number | boolean; // Allow dynamic properties for flexible CSV data
}

/**
 * Word extracted from PDF with position information
 */
export interface Word {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

/**
 * Column configuration for parsing PDF transactions
 */
export interface ColumnConfig {
  date1: [number, number];
  date2: [number, number];
  description: [number, number];
  debit: [number, number];
  credit: [number, number];
  balance: [number, number];
}
