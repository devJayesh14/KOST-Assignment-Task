import { Component, input } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';
import { OrganisationStatus } from '../models/organisation';

@Component({
  selector: 'app-status-badge',
  imports: [TranslatePipe],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.scss',
})
export class StatusBadge {
  readonly status = input.required<OrganisationStatus>();
  readonly rawStatus = input<string | null>(null);
}
