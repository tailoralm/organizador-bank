import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editable-table',
  imports: [CommonModule],
  templateUrl: './editable-table.component.html',
  styleUrl: './editable-table.component.scss',
})
export class EditableTableComponent {
  data = input.required<any[]>();
  dataChange = output<any[]>();

  private editingCell = signal<{ row: number; col: string } | null>(null);
  private editValue = signal<string>('');

  getHeaders(): string[] {
    const d = this.data();
    return d.length > 0 ? Object.keys(d[0]) : [];
  }

  isEditing(rowIndex: number, column: string): boolean {
    const cell = this.editingCell();
    return cell !== null && cell.row === rowIndex && cell.col === column;
  }

  getEditValue(): string {
    return this.editValue();
  }

  onCellClick(rowIndex: number, column: string, event: Event): void {
    event.stopPropagation();
    if (!this.isEditing(rowIndex, column)) {
      this.startEdit(rowIndex, column);
    }
  }

  private startEdit(rowIndex: number, column: string): void {
    const d = this.data();
    this.editingCell.set({ row: rowIndex, col: column });
    this.editValue.set(d[rowIndex][column] || '');

    setTimeout(() => {
      const input = document.querySelector('.cell-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  onInputChange(value: string): void {
    this.editValue.set(value);
  }

  saveEdit(event?: Event): void {
    event?.stopPropagation();
    const cell = this.editingCell();
    if (!cell) return;

    const updatedData = [...this.data()];
    updatedData[cell.row][cell.col] = this.editValue();
    this.dataChange.emit(updatedData);

    this.editingCell.set(null);
    this.editValue.set('');
  }

  cancelEdit(event?: Event): void {
    event?.stopPropagation();
    this.editingCell.set(null);
    this.editValue.set('');
  }
}
