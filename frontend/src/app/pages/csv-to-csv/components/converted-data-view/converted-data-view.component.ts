import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditableTableComponent } from '../../../../shared/components/editable-table/editable-table.component';
import { CsvRow } from '../../../../shared/models/csv.model';

@Component({
  selector: 'app-converted-data-view',
  imports: [CommonModule, EditableTableComponent],
  templateUrl: './converted-data-view.component.html',
  styleUrl: './converted-data-view.component.scss',
})
export class ConvertedDataViewComponent {
  data = input.required<CsvRow[]>();
  dataChange = output<CsvRow[]>();
  clear = output<void>();
  download = output<void>();

  onDataChange(updatedData: CsvRow[]): void {
    this.dataChange.emit(updatedData);
  }
}
