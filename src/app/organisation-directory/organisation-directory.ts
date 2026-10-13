import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { PAGE_SIZE } from '../data/directory-query';
import { DirectoryToolbar } from '../directory-toolbar/directory-toolbar';
import { EmptyState } from '../empty-state/empty-state';
import { ErrorState } from '../error-state/error-state';
import { Header } from '../header/header';
import { TranslatePipe } from '../i18n/translate.pipe';
import { TranslationService } from '../i18n/translation.service';
import { Organisation } from '../models/organisation';
import { OrganisationForm } from '../organisation-form/organisation-form';
import { OrganisationTable } from '../organisation-table/organisation-table';
import { Pagination } from '../pagination/pagination';
import { OrganisationDirectoryStore } from './organisation-directory.store';

@Component({
  selector: 'app-organisation-directory',
  imports: [
    TranslatePipe,
    Header,
    DirectoryToolbar,
    OrganisationTable,
    Pagination,
    EmptyState,
    ErrorState,
    OrganisationForm,
  ],
  providers: [OrganisationDirectoryStore],
  templateUrl: './organisation-directory.html',
  styleUrl: './organisation-directory.scss',
})
export class OrganisationDirectory {
  protected readonly store = inject(OrganisationDirectoryStore);
  private readonly translations = inject(TranslationService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly drawerOpen = signal(false);
  protected readonly announcement = signal('');

  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  private returnFocusTo: HTMLElement | null = null;

  /** A plain `#directory` link would drop the query string, so focus is moved manually. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }

  protected openDrawer(): void {
    const active = this.document.activeElement;
    this.returnFocusTo = active instanceof HTMLElement ? active : null;
    this.announcement.set('');
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    const target = this.returnFocusTo;
    this.returnFocusTo = null;
    this.drawerOpen.set(false);
    afterNextRender(() => target?.focus(), { injector: this.injector });
  }

  protected onCreated(organisation: Organisation): void {
    this.closeDrawer();
    this.announcement.set(
      this.translations.translate('directory.created', { name: organisation.name ?? '' }),
    );
    this.store.retry();
  }
}
