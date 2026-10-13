import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { Organisation, SortColumn, SortOrder } from '../models/organisation';
import { StatusBadge } from '../status-badge/status-badge';

@Component({
  selector: 'app-organisation-table',
  imports: [TranslatePipe, StatusBadge, DatePipe, DecimalPipe],
  templateUrl: './organisation-table.html',
  styleUrl: './organisation-table.scss',
})
export class OrganisationTable {
  readonly rows = input<readonly Organisation[]>([]);
  readonly loading = input(false);
  readonly sort = input<SortColumn | null>(null);
  readonly order = input<SortOrder>('asc');

  readonly sortChange = output<SortColumn>();

  protected readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8] as const;

  protected ariaSort(column: SortColumn): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== column) {
      return 'none';
    }
    return this.order() === 'asc' ? 'ascending' : 'descending';
  }

  protected isSorted(column: SortColumn, order: SortOrder): boolean {
    return this.sort() === column && this.order() === order;
  }
}
