import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { catchError, map, Observable, of } from 'rxjs';
import { EMAIL_PATTERN } from '../data/email';
import { OrganisationsApi } from '../data/organisations-api';

/** Whitespace-only input counts as empty. */
export function requiredTrimmed(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() === '' ? { required: true } : null;
}

export function trimmedLength(min: number, max: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const length = control.value.trim().length;
    if (length === 0) {
      return null;
    }
    if (length < min) {
      return { minlength: { requiredLength: min, actualLength: length } };
    }
    if (length > max) {
      return { maxlength: { requiredLength: max, actualLength: length } };
    }
    return null;
  };
}

/** Stricter than `Validators.email`, which accepts addresses without a domain dot such as `a@b`. */
export function emailFormat(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  return value === '' || EMAIL_PATTERN.test(value) ? null : { email: true };
}

export function wholeNumber(control: AbstractControl<number | null>): ValidationErrors | null {
  return control.value === null || Number.isInteger(control.value) ? null : { wholeNumber: true };
}

/** A failed availability check does not block the user; the create request is checked again. */
export function uniqueName(api: OrganisationsApi): AsyncValidatorFn {
  return (control: AbstractControl<string>): Observable<ValidationErrors | null> =>
    api.isNameAvailable(control.value.trim()).pipe(
      map((available) => (available ? null : { nameTaken: true })),
      catchError(() => of(null)),
    );
}
