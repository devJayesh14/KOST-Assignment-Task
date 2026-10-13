import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslationService } from './i18n/translation.service';
import { OrganisationDirectory } from './organisation-directory/organisation-directory';

export const routes: Routes = [
  {
    path: '',
    component: OrganisationDirectory,
    title: () => inject(TranslationService).translate('app.title'),
  },
  { path: '**', redirectTo: '' },
];
