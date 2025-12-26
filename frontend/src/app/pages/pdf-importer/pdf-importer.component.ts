import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CsvDataService } from '../../services/csv-data.service';
import PdfParserActivobankService from '../../services/pdf-parser/pdf-parser-activobank.service';

interface BankPattern {
  id: string;
  name: string;
}

@Component({
  selector: 'app-pdf-importer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-importer.component.html',
  styleUrl: './pdf-importer.component.scss',
})
export class PdfImporterComponent {
  selectedPattern = signal<string>('activobank');
  isProcessing = signal<boolean>(false);
  isProcessed = signal<boolean>(false);
  errorMessage = signal<string>('');
  fileName = signal<string>('');

  bankPatterns: BankPattern[] = [
    { id: 'activobank', name: 'ActivoBank (Portugal)' },
    // Future patterns will be added here
  ];

  constructor(
    private pdfParserService: PdfParserActivobankService,
    private csvDataService: CsvDataService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.errorMessage.set('Please select a PDF file');
      return;
    }

    this.fileName.set(file.name);
    this.processPdf(file);
  }

  async processPdf(file: File): Promise<void> {
    this.isProcessing.set(true);
    this.errorMessage.set('');
    this.isProcessed.set(false);

    try {
      const pattern = this.selectedPattern();
      const transactions = await this.pdfParserService.parsePdf(file, pattern);

      if (transactions.length === 0) {
        throw new Error('No transactions found in the PDF');
      }

      this.csvDataService.setTransactions(transactions);
      this.isProcessed.set(true);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to process PDF');
      this.isProcessed.set(false);
    } finally {
      this.isProcessing.set(false);
    }
  }

  goToCsvView(): void {
    this.router.navigate(['/csv-view']);
  }

  onPatternChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPattern.set(select.value);
  }
}
