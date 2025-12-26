import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditableTableComponent } from '../../../../shared/components/editable-table/editable-table.component';

@Component({
  selector: 'app-converted-data-view',
  imports: [CommonModule, EditableTableComponent],
  templateUrl: './converted-data-view.component.html',
  styleUrl: './converted-data-view.component.scss',
})
export class ConvertedDataViewComponent {
  data = input.required<any[]>();
  dataChange = output<any[]>();
  clear = output<void>();
  download = output<void>();

  onDataChange(updatedData: any[]): void {
    this.dataChange.emit(updatedData);
  }
}
