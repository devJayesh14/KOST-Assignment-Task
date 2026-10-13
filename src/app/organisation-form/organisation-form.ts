import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, filter, finalize, of, switchMap, take } from 'rxjs';
import { OrganisationsApi } from '../data/organisations-api';
import { TranslatePipe } from '../i18n/translate.pipe';
import {
  CreateOrganisationRequest,
  isKnownStatus,
  KnownStatus,
  Organisation,
  ORGANISATION_STATUSES,
} from '../models/organisation';
import {
  emailFormat,
  requiredTrimmed,
  trimmedLength,
  uniqueName,
  wholeNumber,
} from './organisation-validators';

const NAME_LIMITS = { min: 3, max: 80 } as const;

type FieldName = 'name' | 'status' | 'ownerEmail' | 'memberCount';

interface FieldMeta {
  name: FieldName;
  inputId: string;
  labelKey: string;
}

const FIELDS: readonly FieldMeta[] = [
  { name: 'name', inputId: 'org-name', labelKey: 'form.nameLabel' },
  { name: 'status', inputId: 'org-status', labelKey: 'form.statusLabel' },
  { name: 'ownerEmail', inputId: 'org-owner-email', labelKey: 'form.emailLabel' },
  { name: 'memberCount', inputId: 'org-members', labelKey: 'form.membersLabel' },
];

/** First matching error is shown, so order runs from most to least fundamental. */
const ERROR_PRIORITY = ['required', 'minlength', 'maxlength', 'email', 'nameTaken', 'min', 'wholeNumber'];

@Component({
  selector: 'app-organisation-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './organisation-form.html',
  styleUrl: './organisation-form.scss',
})
export class OrganisationForm {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(OrganisationsApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  readonly dismiss = output<void>();
  readonly created = output<Organisation>();

  protected readonly statuses = ORGANISATION_STATUSES;
  protected readonly nameLimits = NAME_LIMITS;

  /** `updateOn: 'blur'` keeps errors from appearing on every keystroke. */
  protected readonly form = this.fb.group(
    {
      name: this.fb.control('', {
        validators: [requiredTrimmed, trimmedLength(NAME_LIMITS.min, NAME_LIMITS.max)],
        asyncValidators: [uniqueName(this.api)],
      }),
      status: this.fb.control<KnownStatus | ''>('', { validators: [Validators.required] }),
      ownerEmail: this.fb.control('', { validators: [requiredTrimmed, emailFormat] }),
      memberCount: this.fb.control<number | null>(null, {
        validators: [Validators.min(0), wholeNumber],
      }),
    },
    { updateOn: 'blur' },
  );

  /** Form state is not a signal, so templates read this to re-render on any control event. */
  private readonly formEvents = toSignal(this.form.events);

  protected readonly submitting = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly serverError = signal(false);

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  protected readonly summaryItems = computed(() => {
    this.formEvents();
    if (!this.submitAttempted()) {
      return [];
    }
    return FIELDS.flatMap((field) => {
      const errorKey = this.firstErrorKey(field.name);
      return errorKey ? [{ ...field, errorKey }] : [];
    });
  });

  protected readonly summaryVisible = computed(
    () => this.summaryItems().length > 0 || this.serverError(),
  );

  constructor() {
    afterNextRender(() => this.nameInput().nativeElement.focus());
  }

  protected errorKey(field: FieldName): string | null {
    this.formEvents();
    return this.form.controls[field].touched ? this.firstErrorKey(field) : null;
  }

  protected isChecking(field: FieldName): boolean {
    this.formEvents();
    return this.form.controls[field].pending;
  }

  protected focusField(inputId: string): void {
    this.document.getElementById(inputId)?.focus();
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }

    this.submitAttempted.set(true);
    this.serverError.set(false);
    this.form.markAllAsTouched();

    const settled$ = this.form.pending
      ? this.form.statusChanges.pipe(
          filter((status) => status !== 'PENDING'),
          take(1),
        )
      : of(this.form.status);

    settled$
      .pipe(
        switchMap((status) => {
          const request = status === 'VALID' ? this.toRequest() : null;
          if (!request) {
            this.focusSummary();
            return EMPTY;
          }
          this.submitting.set(true);
          return this.api.create(request).pipe(finalize(() => this.submitting.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (organisation) => this.created.emit(organisation),
        error: (error: unknown) => this.onCreateFailed(error),
      });
  }

  private onCreateFailed(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const name = this.form.controls.name;
      name.setErrors({ nameTaken: true });
      name.markAsTouched();
    } else {
      this.serverError.set(true);
    }
    this.focusSummary();
  }

  private firstErrorKey(field: FieldName): string | null {
    const errors = this.form.controls[field].errors;
    if (!errors) {
      return null;
    }
    const match = ERROR_PRIORITY.find((key) => errors[key] !== undefined);
    return `form.errors.${match ?? 'invalid'}`;
  }

  private toRequest(): CreateOrganisationRequest | null {
    const value = this.form.getRawValue();
    if (!isKnownStatus(value.status)) {
      return null;
    }
    return {
      name: value.name.trim(),
      status: value.status,
      ownerEmail: value.ownerEmail.trim(),
      memberCount: value.memberCount,
    };
  }

  private focusSummary(): void {
    afterNextRender(() => this.summary()?.nativeElement.focus(), { injector: this.injector });
  }
}
