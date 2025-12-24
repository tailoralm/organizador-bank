import { Routes } from '@angular/router';
import { CsvViewComponent } from './pages/csv-view/csv-view.component';

export const routes: Routes = [
  { path: '', redirectTo: '/csv-view', pathMatch: 'full' },
  { path: 'csv-view', component: CsvViewComponent },
];
