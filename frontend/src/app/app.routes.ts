import { Routes } from '@angular/router';
import { CsvViewComponent } from './pages/csv-view/csv-view.component';
import { PdfImporterComponent } from './pages/pdf-importer/pdf-importer.component';
import { CsvToCsvComponent } from './pages/csv-to-csv/csv-to-csv.component';

export const routes: Routes = [
  { path: '', redirectTo: '/pdf-importer', pathMatch: 'full' },
  { path: 'pdf-importer', component: PdfImporterComponent },
  { path: 'csv-view', component: CsvViewComponent },
  { path: 'csv-to-csv', component: CsvToCsvComponent },
];
