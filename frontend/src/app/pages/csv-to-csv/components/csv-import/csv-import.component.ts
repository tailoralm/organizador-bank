import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as Papa from 'papaparse';
import { Transaction } from '../../../../services/pdf-parser/pdf-parser.service';

@Component({
  selector: 'app-csv-import',
  imports: [CommonModule],
  templateUrl: './csv-import.component.html',
  styleUrl: './csv-import.component.scss',
})
export class CsvImportComponent {
  dataLoaded = output<Transaction[]>();

  isDragging = signal<boolean>(false);
  fileInfo = signal<{ name: string; rows: number } | null>(null);

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
    if (files?.length) this.handleFile(files[0]);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  private handleFile(file: File): void {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const transactions: Transaction[] = results.data.map((row: any) => ({
          date: row.date || row.Date || '',
          description: row.description || row.Description || '',
          value: row.value || row.Value || '',
          balance: row.balance || row.Balance || '',
        }));
        this.fileInfo.set({ name: file.name, rows: transactions.length });
        this.dataLoaded.emit(transactions);
      },
      error: () => alert('Error parsing CSV file'),
    });
  }
}
