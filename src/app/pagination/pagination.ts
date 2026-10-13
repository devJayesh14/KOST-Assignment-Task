import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

type PageItem = { kind: 'page'; page: number } | { kind: 'gap'; id: string };

/** Above this many pages, only the first, last and neighbours of the current page are shown. */
const MAX_PAGES_WITHOUT_GAPS = 7;

@Component({
  selector: 'app-pagination',
  imports: [TranslatePipe],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
})
export class Pagination {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();

  readonly pageChange = output<number>();

  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  protected readonly from = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );

  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));

  protected readonly items = computed<readonly PageItem[]>(() => {
    const count = this.pageCount();
    const current = this.page();
    const pages =
      count <= MAX_PAGES_WITHOUT_GAPS
        ? Array.from({ length: count }, (_, index) => index + 1)
        : [...new Set([1, current - 1, current, current + 1, count])]
            .filter((page) => page >= 1 && page <= count)
            .sort((a, b) => a - b);

    const items: PageItem[] = [];
    pages.forEach((page, index) => {
      if (index > 0 && page - pages[index - 1] > 1) {
        items.push({ kind: 'gap', id: `gap-${page}` });
      }
      items.push({ kind: 'page', page });
    });
    return items;
  });
}
