import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-error-state',
  imports: [TranslatePipe],
  templateUrl: './error-state.html',
  styleUrl: './error-state.scss',
})
export class ErrorState {
  readonly reason = input<'failed' | 'rateLimited'>('failed');
  readonly retryInSeconds = input(0);
  readonly retry = output<void>();
}
