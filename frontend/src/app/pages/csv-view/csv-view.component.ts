import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as Papa from 'papaparse';
import { CsvDataService } from '../../services/csv-data.service';
import { Transaction } from '../../services/pdf-parser/pdf-parser.service';

interface CsvData {
  headers: string[];
  rows: string[][];
}

@Component({
  selector: 'app-csv-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './csv-view.component.html',
  styleUrl: './csv-view.component.scss',
})
export class CsvViewComponent implements OnInit {
  csvData = signal<CsvData | null>(null);
  filterText = signal<string>('');
  isDragging = signal<boolean>(false);

  constructor(private csvDataService: CsvDataService) {}

  ngOnInit(): void {
    // Check if there's data from the PDF importer
    if (this.csvDataService.hasTransactions()) {
      this.loadTransactionsFromService();
    }
  }

  private loadTransactionsFromService(): void {
    const transactions = this.csvDataService.getTransactions();
    if (transactions.length === 0) return;

    const headers = ['date', 'description', 'debit', 'credit', 'balance'];
    const rows = transactions.map((t: Transaction) => [
      t.date,
      t.description,
      t.debit,
      t.credit,
      t.balance,
    ]);

    this.csvData.set({ headers, rows });
  }

  get filteredRows(): string[][] {
    const data = this.csvData();
    const filter = this.filterText().toLowerCase().trim();

    if (!data || !filter) {
      return data?.rows || [];
    }

    return data.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(filter)));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.data[0] as string[];
          const rows = results.data.slice(1) as string[][];

          // Filter out empty rows
          const filteredRows = rows.filter((row) => row.some((cell) => cell && cell.trim() !== ''));

          this.csvData.set({
            headers,
            rows: filteredRows,
          });
          this.filterText.set('');
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file');
      },
    });
  }

  clearData(): void {
    this.csvData.set(null);
    this.filterText.set('');
    this.csvDataService.clearTransactions();
  }

  downloadCsv(): void {
    this.csvDataService.downloadCsv();
  }
}
