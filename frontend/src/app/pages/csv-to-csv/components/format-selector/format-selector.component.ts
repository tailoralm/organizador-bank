import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConversionFormat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-format-selector',
  imports: [CommonModule],
  templateUrl: './format-selector.component.html',
  styleUrl: './format-selector.component.scss',
})
export class FormatSelectorComponent {
  formats = input.required<ConversionFormat[]>();
  formatSelected = output<string>();

  selectedFormat = signal<string>('');

  onFormatChange(value: string): void {
    this.selectedFormat.set(value);
    this.formatSelected.emit(value);
  }
}
