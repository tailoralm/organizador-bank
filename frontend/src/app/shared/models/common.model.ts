/**
 * Generic select option interface for dropdowns and selectors
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Bank pattern configuration for PDF parsing
 */
export interface BankPattern extends SelectOption {
  id: string;
  name: string;
}

/**
 * Conversion format option
 */
export interface ConversionFormat extends SelectOption {}

/**
 * Request to fill a column with a specific value
 */
export interface FillColumnRequest {
  column: string;
  value: string;
}

/**
 * File information metadata
 */
export interface FileInfo {
  name: string;
  rows: number;
}
