import {
  HttpErrorResponse,
  HttpEvent,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { mergeMap, Observable, of, throwError, timer } from 'rxjs';
import { EMAIL_PATTERN } from '../data/email';
import { NAME_AVAILABILITY_URL, ORGANISATIONS_URL } from '../data/organisations-api';
import fixture from './organisations.fixture.json';

/**
 * In-browser stand-in for the organisations API.
 * Records are served as stored in the fixture; cleaning them is the client's job.
 */

const MIN_DELAY_MS = 400;
const MAX_DELAY_MS = 900;
const LIST_FAILURE_RATE = 0.15;
const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_PAGE_SIZE = 25;
const NAME_MIN = 3;
const NAME_MAX = 80;
const KNOWN_STATUSES = ['active', 'inactive', 'suspended'];

type RawRecord = Record<string, unknown>;

const records: RawRecord[] = structuredClone(fixture as unknown as RawRecord[]);
const listRequestTimes: number[] = [];

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url === ORGANISATIONS_URL && req.method === 'GET') {
    return listOrganisations(req);
  }
  if (req.url === ORGANISATIONS_URL && req.method === 'POST') {
    return createOrganisation(req);
  }
  if (req.url === NAME_AVAILABILITY_URL && req.method === 'GET') {
    return nameAvailability(req);
  }
  return next(req);
};

function listOrganisations(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const now = Date.now();
  while (listRequestTimes.length > 0 && now - listRequestTimes[0] >= RATE_LIMIT_WINDOW_MS) {
    listRequestTimes.shift();
  }

  if (listRequestTimes.length >= RATE_LIMIT_REQUESTS) {
    const retryAfter = Math.ceil((listRequestTimes[0] + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return reject(req, 429, { code: 'RATE_LIMITED' }, new HttpHeaders({ 'Retry-After': String(retryAfter) }));
  }
  listRequestTimes.push(now);

  if (Math.random() < LIST_FAILURE_RATE) {
    return reject(req, 503, { code: 'UNAVAILABLE' });
  }

  const params = req.params;
  const search = (params.get('q') ?? '').trim().toLowerCase();
  const status = params.get('status');
  const sort = params.get('sort');
  const direction = params.get('order') === 'desc' ? -1 : 1;
  const pageSize = Math.min(Math.max(Number(params.get('pageSize')) || MAX_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const page = Math.max(Math.floor(Number(params.get('page'))) || 1, 1);

  let matches = records.filter(
    (record) =>
      (!search || text(record['name']).toLowerCase().includes(search)) &&
      (!status || statusOf(record) === status),
  );

  if (sort === 'name') {
    matches = [...matches].sort((a, b) =>
      compareMissingLast(text(a['name']) || null, text(b['name']) || null, direction, (x, y) =>
        x.localeCompare(y, undefined, { sensitivity: 'base' }),
      ),
    );
  } else if (sort === 'created') {
    matches = [...matches].sort((a, b) =>
      compareMissingLast(timeOf(a), timeOf(b), direction, (x, y) => x - y),
    );
  }

  const start = (page - 1) * pageSize;
  return respond(req, 200, {
    items: matches.slice(start, start + pageSize),
    total: matches.length,
    page,
    pageSize,
  });
}

function nameAvailability(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const name = req.params.get('name') ?? '';
  return respond(req, 200, { available: !nameTaken(name) });
}

function createOrganisation(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  return timer(randomDelay()).pipe(
    mergeMap(() => {
      const body: RawRecord =
        typeof req.body === 'object' && req.body !== null ? (req.body as RawRecord) : {};
      const name = text(body['name']);
      const email = text(body['ownerEmail']);
      const memberCount = body['memberCount'];

      if (nameTaken(name)) {
        return throwError(() => errorResponse(req, 409, { code: 'NAME_TAKEN' }));
      }

      const valid =
        name.length >= NAME_MIN &&
        name.length <= NAME_MAX &&
        KNOWN_STATUSES.includes(text(body['status'])) &&
        EMAIL_PATTERN.test(email) &&
        (memberCount === null ||
          (typeof memberCount === 'number' && Number.isInteger(memberCount) && memberCount >= 0));

      if (!valid) {
        return throwError(() => errorResponse(req, 422, { code: 'VALIDATION_FAILED' }));
      }

      const created: RawRecord = {
        id: nextId(),
        name,
        status: text(body['status']),
        memberCount,
        owner: { email },
        createdAt: new Date().toISOString(),
      };
      records.unshift(created);

      return of(new HttpResponse({ status: 201, body: created, url: req.url }));
    }),
  );
}

function respond(req: HttpRequest<unknown>, status: number, body: unknown): Observable<HttpEvent<unknown>> {
  return timer(randomDelay()).pipe(
    mergeMap(() => of(new HttpResponse({ status, body, url: req.url }))),
  );
}

function reject(
  req: HttpRequest<unknown>,
  status: number,
  body: unknown,
  headers?: HttpHeaders,
): Observable<HttpEvent<unknown>> {
  return timer(randomDelay()).pipe(
    mergeMap(() => throwError(() => errorResponse(req, status, body, headers))),
  );
}

function errorResponse(
  req: HttpRequest<unknown>,
  status: number,
  body: unknown,
  headers?: HttpHeaders,
): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, headers, url: req.url });
}

function randomDelay(): number {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function comparableName(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

function nameTaken(name: string): boolean {
  const candidate = comparableName(name);
  return candidate !== '' && records.some((record) => comparableName(text(record['name'])) === candidate);
}

function statusOf(record: RawRecord): string {
  const status = text(record['status']).toLowerCase();
  return KNOWN_STATUSES.includes(status) ? status : 'unknown';
}

function timeOf(record: RawRecord): number | null {
  const value = record['createdAt'];
  const time =
    typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function compareMissingLast<T>(
  a: T | null,
  b: T | null,
  direction: number,
  compare: (x: T, y: T) => number,
): number {
  if (a === null || b === null) {
    return a === b ? 0 : a === null ? 1 : -1;
  }
  return compare(a, b) * direction;
}

function nextId(): number {
  const ids = records.map((record) => record['id']).filter((id): id is number => typeof id === 'number');
  return Math.max(0, ...ids) + 1;
}
