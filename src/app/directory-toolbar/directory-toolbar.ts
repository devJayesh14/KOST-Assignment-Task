import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { isStatusFilter, STATUS_FILTERS, StatusFilter } from '../models/organisation';

@Component({
  selector: 'app-directory-toolbar',
  imports: [TranslatePipe],
  templateUrl: './directory-toolbar.html',
  styleUrl: './directory-toolbar.scss',
})
export class DirectoryToolbar {
  readonly searchText = input('');
  readonly status = input<StatusFilter>('all');
  /** `null` while the total is unknown, for example during loading. */
  readonly resultCount = input<number | null>(null);

  readonly searchTextChange = output<string>();
  readonly statusChange = output<StatusFilter>();
  readonly clearFilters = output<void>();

  protected readonly statusOptions = STATUS_FILTERS;

  protected readonly resultCountKey = computed(() =>
    this.resultCount() === 1 ? 'toolbar.resultCountOne' : 'toolbar.resultCount',
  );

  protected statusLabelKey(option: StatusFilter): string {
    return option === 'all' ? 'toolbar.statusAll' : `status.${option}`;
  }

  protected onSearchInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTextChange.emit(event.target.value);
    }
  }

  protected onStatusChange(event: Event): void {
    if (event.target instanceof HTMLSelectElement && isStatusFilter(event.target.value)) {
      this.statusChange.emit(event.target.value);
    }
  }
}
