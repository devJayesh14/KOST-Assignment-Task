import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, linkedSignal, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  interval,
  map,
  Observable,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import {
  DirectoryQuery,
  PAGE_SIZE,
  parseDirectoryQuery,
  sameDirectoryQuery,
  toQueryParams,
} from '../data/directory-query';
import { OrganisationsApi } from '../data/organisations-api';
import { OrganisationPage, SortColumn, StatusFilter } from '../models/organisation';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

export type ListState =
  | { kind: 'loading' }
  | { kind: 'loaded'; page: OrganisationPage }
  | { kind: 'error'; reason: 'failed' | 'rateLimited'; retryAt: number | null };

/** State for one directory screen. The URL is the source of truth for search, filter, sort and page. */
@Injectable()
export class OrganisationDirectoryStore {
  private readonly api = inject(OrganisationsApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly query$: Observable<DirectoryQuery> = this.route.queryParamMap.pipe(
    map(parseDirectoryQuery),
    distinctUntilChanged(sameDirectoryQuery),
  );

  readonly query = toSignal(this.query$, { requireSync: true });

  /** What the user is typing; it reaches the URL after the debounce. */
  readonly searchText = linkedSignal(() => this.query().search);

  private readonly reloadToken = signal(0);

  readonly state = toSignal(
    combineLatest([this.query$, toObservable(this.reloadToken)]).pipe(
      switchMap(([query]) =>
        this.api.list(query).pipe(
          map((page): ListState => ({ kind: 'loaded', page })),
          catchError((error: unknown) => of(toErrorState(error))),
          startWith<ListState>({ kind: 'loading' }),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } satisfies ListState },
  );

  readonly filtersActive = computed(() => {
    const query = this.query();
    return query.search !== '' || query.status !== 'all';
  });

  readonly total = computed(() => {
    const state = this.state();
    return state.kind === 'loaded' ? state.page.total : null;
  });

  private readonly now = toSignal(interval(1000).pipe(map(() => Date.now())), {
    initialValue: Date.now(),
  });

  readonly retryInSeconds = computed(() => {
    const state = this.state();
    if (state.kind !== 'error' || state.retryAt === null) {
      return 0;
    }
    return Math.max(0, Math.ceil((state.retryAt - this.now()) / 1000));
  });

  constructor() {
    toObservable(this.searchText)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((text) => text.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => {
        if (search !== this.query().search) {
          this.updateQuery({ search, page: 1 }, true);
        }
      });

    effect(() => {
      const state = this.state();
      if (state.kind === 'error' && state.retryAt !== null && this.retryInSeconds() === 0) {
        untracked(() => this.retry());
      }
    });

    effect(() => {
      const state = this.state();
      if (state.kind !== 'loaded') {
        return;
      }
      const lastPage = Math.max(1, Math.ceil(state.page.total / PAGE_SIZE));
      if (untracked(this.query).page > lastPage) {
        untracked(() => this.updateQuery({ page: lastPage }, true));
      }
    });
  }

  setStatus(status: StatusFilter): void {
    this.updateQuery({ status, page: 1 });
  }

  /** Cycles ascending, descending, then back to the API's default order. */
  toggleSort(column: SortColumn): void {
    const { sort, order } = this.query();
    if (sort !== column) {
      this.updateQuery({ sort: column, order: 'asc', page: 1 });
    } else if (order === 'asc') {
      this.updateQuery({ order: 'desc', page: 1 });
    } else {
      this.updateQuery({ sort: null, order: 'asc', page: 1 });
    }
  }

  setPage(page: number): void {
    this.updateQuery({ page });
  }

  clearFilters(): void {
    this.searchText.set('');
    this.updateQuery({ search: '', status: 'all', page: 1 });
  }

  retry(): void {
    this.reloadToken.update((token) => token + 1);
  }

  private updateQuery(patch: Partial<DirectoryQuery>, replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams({ ...this.query(), ...patch }),
      replaceUrl,
    });
  }
}

function toErrorState(error: unknown): ListState {
  if (error instanceof HttpErrorResponse && error.status === 429) {
    const header = Number(error.headers.get('Retry-After'));
    const seconds = Number.isFinite(header) && header > 0 ? header : DEFAULT_RETRY_AFTER_SECONDS;
    return { kind: 'error', reason: 'rateLimited', retryAt: Date.now() + seconds * 1000 };
  }
  return { kind: 'error', reason: 'failed', retryAt: null };
}
