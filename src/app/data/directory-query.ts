import { HttpParams } from '@angular/common/http';
import { ParamMap, Params } from '@angular/router';
import { isStatusFilter, SortColumn, SortOrder, StatusFilter } from '../models/organisation';

/** The API returns at most 25 records per request. */
export const PAGE_SIZE = 25;

export interface DirectoryQuery {
  search: string;
  status: StatusFilter;
  sort: SortColumn | null;
  order: SortOrder;
  page: number;
}

export function parseDirectoryQuery(params: ParamMap): DirectoryQuery {
  const status = params.get('status') ?? '';
  const sort = params.get('sort');
  const page = Number(params.get('page'));

  return {
    search: (params.get('q') ?? '').trim(),
    status: isStatusFilter(status) ? status : 'all',
    sort: sort === 'name' || sort === 'created' ? sort : null,
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Default values are left out so a shared URL only contains what the user changed. */
export function toQueryParams(query: DirectoryQuery): Params {
  const params: Params = {};
  if (query.search) {
    params['q'] = query.search;
  }
  if (query.status !== 'all') {
    params['status'] = query.status;
  }
  if (query.sort) {
    params['sort'] = query.sort;
    if (query.order === 'desc') {
      params['order'] = 'desc';
    }
  }
  if (query.page > 1) {
    params['page'] = query.page;
  }
  return params;
}

export function toListParams(query: DirectoryQuery): HttpParams {
  let params = new HttpParams().set('page', query.page).set('pageSize', PAGE_SIZE);
  if (query.search) {
    params = params.set('q', query.search);
  }
  if (query.status !== 'all') {
    params = params.set('status', query.status);
  }
  if (query.sort) {
    params = params.set('sort', query.sort).set('order', query.order);
  }
  return params;
}

export function sameDirectoryQuery(a: DirectoryQuery, b: DirectoryQuery): boolean {
  return (
    a.search === b.search &&
    a.status === b.status &&
    a.sort === b.sort &&
    a.order === b.order &&
    a.page === b.page
  );
}
