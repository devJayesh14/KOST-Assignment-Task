export const ORGANISATION_STATUSES = ['active', 'inactive', 'suspended'] as const;

export type KnownStatus = (typeof ORGANISATION_STATUSES)[number];

export type OrganisationStatus = KnownStatus | 'unknown';

export const STATUS_FILTERS = ['all', ...ORGANISATION_STATUSES, 'unknown'] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export function isKnownStatus(value: string): value is KnownStatus {
  return ORGANISATION_STATUSES.some((status) => status === value);
}

export function isStatusFilter(value: string): value is StatusFilter {
  return STATUS_FILTERS.some((option) => option === value);
}

export type SortColumn = 'name' | 'created';

export type SortOrder = 'asc' | 'desc';

export interface Organisation {
  /** Unique within a rendered list. Source ids are not unique (two records share id 42). */
  key: string;
  id: number | null;
  /** `null` when the source name is missing, empty, or whitespace. */
  name: string | null;
  status: OrganisationStatus;
  /** Source value, kept so an unknown status can be explained. */
  rawStatus: string | null;
  memberCount: number | null;
  ownerEmail: string | null;
  ownerEmailValid: boolean;
  createdAt: Date | null;
}

export interface OrganisationPage {
  items: readonly Organisation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOrganisationRequest {
  name: string;
  status: KnownStatus;
  ownerEmail: string;
  memberCount: number | null;
}
