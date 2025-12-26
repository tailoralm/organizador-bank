import { Component, input, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

export interface FillColumnRequest {
  column: string;
  value: string;
}

@Component({
  selector: 'app-fill-column-modal',
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './fill-column-modal.component.html',
  styleUrl: './fill-column-modal.component.scss',
})
export class FillColumnModalComponent {
  @ViewChild(ModalComponent) modal!: ModalComponent;

  columns = input.required<string[]>();
  fillRequested = output<FillColumnRequest>();

  selectedColumn = signal<string>('');
  fillValue = signal<string>('');

  open(): void {
    this.selectedColumn.set('');
    this.fillValue.set('');
    this.modal.open();
  }

  close(): void {
    this.modal.closeModal();
  }

  onSubmit(): void {
    const column = this.selectedColumn();
    const value = this.fillValue();

    if (!column) {
      alert('Please select a column');
      return;
    }

    this.fillRequested.emit({ column, value });
    this.close();
  }

  onColumnChange(value: string): void {
    this.selectedColumn.set(value);
  }

  onValueChange(value: string): void {
    this.fillValue.set(value);
  }
}
