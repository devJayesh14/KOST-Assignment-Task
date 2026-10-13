import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { CreateOrganisationRequest, Organisation, OrganisationPage } from '../models/organisation';
import { DirectoryQuery, toListParams } from './directory-query';
import { isRecord, normalizeOrganisation, parseOrganisationPage } from './normalize-organisation';

export const ORGANISATIONS_URL = 'api/organisations';
export const NAME_AVAILABILITY_URL = 'api/organisations/name-availability';

@Injectable({ providedIn: 'root' })
export class OrganisationsApi {
  private readonly http = inject(HttpClient);

  /** Successful pages are reused so revisiting a page does not spend the 5-requests-per-minute budget. */
  private readonly pageCache = new Map<string, OrganisationPage>();

  list(query: DirectoryQuery): Observable<OrganisationPage> {
    const params = toListParams(query);
    const cacheKey = params.toString();
    const cached = this.pageCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    return this.http.get<unknown>(ORGANISATIONS_URL, { params }).pipe(
      map(parseOrganisationPage),
      tap((page) => this.pageCache.set(cacheKey, page)),
    );
  }

  /** The server stays the final authority: a name can still be rejected with 409 on create. */
  isNameAvailable(name: string): Observable<boolean> {
    return this.http
      .get<unknown>(NAME_AVAILABILITY_URL, { params: { name } })
      .pipe(map((body) => !(isRecord(body) && body['available'] === false)));
  }

  create(request: CreateOrganisationRequest): Observable<Organisation> {
    return this.http.post<unknown>(ORGANISATIONS_URL, request).pipe(
      map((body) => normalizeOrganisation(body, `created-${Date.now()}`)),
      tap(() => this.pageCache.clear()),
    );
  }
}
