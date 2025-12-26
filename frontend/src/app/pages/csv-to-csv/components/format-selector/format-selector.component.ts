import { Component, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversionFormat, FillColumnRequest } from '../../../../shared/models/common.model';
import { FillColumnModalComponent } from '../fill-column-modal/fill-column-modal.component';

@Component({
  selector: 'app-format-selector',
  imports: [CommonModule, FillColumnModalComponent],
  templateUrl: './format-selector.component.html',
  styleUrl: './format-selector.component.scss',
})
export class FormatSelectorComponent {
  @ViewChild(FillColumnModalComponent) fillModal!: FillColumnModalComponent;

  formats = input.required<ConversionFormat[]>();
  columns = input<string[]>([]);
  formatSelected = output<string>();
  fillColumnRequested = output<FillColumnRequest>();

  selectedFormat = signal<string>('');

  onFormatChange(value: string): void {
    this.selectedFormat.set(value);
    this.formatSelected.emit(value);
  }

  openFillModal(): void {
    this.fillModal.open();
  }

  onFillRequested(request: FillColumnRequest): void {
    this.fillColumnRequested.emit(request);
  }
}
