import { isKnownStatus, Organisation, OrganisationPage, OrganisationStatus } from '../models/organisation';
import { EMAIL_PATTERN } from './email';

type UnknownRecord = Record<string, unknown>;

/** Epoch values below this are treated as seconds rather than milliseconds. */
const EPOCH_SECONDS_THRESHOLD = 1e11;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeOrganisation(raw: unknown, key: string): Organisation {
  const record = isRecord(raw) ? raw : {};
  const rawStatus = typeof record['status'] === 'string' ? record['status'] : null;
  const ownerEmail = normalizeOwnerEmail(record['owner']);

  return {
    key,
    id: normalizeId(record['id']),
    name: normalizeName(record['name']),
    status: normalizeStatus(rawStatus),
    rawStatus,
    memberCount: normalizeMemberCount(record['memberCount']),
    ownerEmail,
    ownerEmailValid: ownerEmail !== null && EMAIL_PATTERN.test(ownerEmail),
    createdAt: normalizeDate(record['createdAt']),
  };
}

export function parseOrganisationPage(body: unknown): OrganisationPage {
  if (!isRecord(body) || !Array.isArray(body['items'])) {
    throw new Error('Malformed organisation list response');
  }

  const items: unknown[] = body['items'];
  const page = positiveInteger(body['page']) ?? 1;
  const pageSize = positiveInteger(body['pageSize']) ?? Math.max(items.length, 1);
  const total = nonNegativeInteger(body['total']) ?? items.length;
  const offset = (page - 1) * pageSize;

  return {
    items: items.map((raw, index) => normalizeOrganisation(raw, `row-${offset + index}`)),
    total,
    page,
    pageSize,
  };
}

function normalizeId(value: unknown): number | null {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value);
  }
  return nonNegativeInteger(value);
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const name = value.trim();
  return name === '' ? null : name;
}

/** Typos such as "actve" become `unknown`; guessing the intended status would hide bad data. */
function normalizeStatus(value: string | null): OrganisationStatus {
  const status = value?.trim().toLowerCase() ?? '';
  return isKnownStatus(status) ? status : 'unknown';
}

/** Negative or non-numeric counts are not real member counts, so they become `null`. */
function normalizeMemberCount(value: unknown): number | null {
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value);
  }
  return nonNegativeInteger(value);
}

function normalizeOwnerEmail(owner: unknown): string | null {
  if (!isRecord(owner) || typeof owner['email'] !== 'string') {
    return null;
  }
  const email = owner['email'].trim();
  return email === '' ? null : email;
}

function normalizeDate(value: unknown): Date | null {
  let date: Date | null = null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    date = new Date(value < EPOCH_SECONDS_THRESHOLD ? value * 1000 : value);
  } else if (typeof value === 'string' && value.trim() !== '') {
    date = new Date(value);
  }

  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function positiveInteger(value: unknown): number | null {
  const number = nonNegativeInteger(value);
  return number !== null && number > 0 ? number : null;
}
