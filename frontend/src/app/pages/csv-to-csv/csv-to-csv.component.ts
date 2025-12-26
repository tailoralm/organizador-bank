import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../services/pdf-parser/pdf-parser.service';
import CashewService from '../../services/csv-to-csv/cashew.service';
import { CsvImportComponent } from './components/csv-import/csv-import.component';
import {
  FormatSelectorComponent,
  ConversionFormat,
} from './components/format-selector/format-selector.component';
import { ConvertedDataViewComponent } from './components/converted-data-view/converted-data-view.component';

interface CsvRow {
  [key: string]: any;
}

@Component({
  selector: 'app-csv-to-csv',
  imports: [CommonModule, CsvImportComponent, FormatSelectorComponent, ConvertedDataViewComponent],
  templateUrl: './csv-to-csv.component.html',
  styleUrl: './csv-to-csv.component.scss',
})
export class CsvToCsvComponent {
  sourceData = signal<Transaction[] | null>(null);
  convertedData = signal<CsvRow[] | null>(null);
  selectedFormat = signal<string>('');

  private cashewService = new CashewService();

  formats: ConversionFormat[] = [{ value: 'cashew', label: 'Cashew' }];

  onDataLoaded(data: Transaction[]): void {
    this.sourceData.set(data);
    if (this.selectedFormat()) {
      this.convertData();
    }
  }

  onFormatSelected(format: string): void {
    this.selectedFormat.set(format);
    if (this.sourceData()) {
      this.convertData();
    }
  }

  onDataChange(updatedData: CsvRow[]): void {
    this.convertedData.set(updatedData);
  }

  private convertData(): void {
    const source = this.sourceData();
    const format = this.selectedFormat();
    if (!source || !format) return;

    let converted: CsvRow[] = [];
    if (format === 'cashew') {
      converted = this.cashewService.fromTransactions(source);
    }
    this.convertedData.set(converted);
  }

  downloadCsv(): void {
    const data = this.convertedData();
    if (!data?.length) {
      alert('No data to download');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((h) => {
        const val = row[h] || '';
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `converted_${this.selectedFormat()}_${Date.now()}.csv`;
    link.click();
  }

  clearData(): void {
    this.sourceData.set(null);
    this.convertedData.set(null);
    this.selectedFormat.set('');
  }
}
