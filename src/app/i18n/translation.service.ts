import { Injectable } from '@angular/core';
import en from './en.json';

type TranslationNode = string | { readonly [key: string]: TranslationNode };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly messages = en as TranslationNode;

  translate(key: string, params?: Readonly<Record<string, string | number>>): string {
    const value = this.lookup(key);
    if (!params) {
      return value;
    }

    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match: string, name: string) => {
      const param = params[name];
      return param === undefined ? '' : String(param);
    });
  }

  private lookup(key: string): string {
    let node: TranslationNode | undefined = this.messages;

    for (const part of key.split('.')) {
      if (typeof node !== 'object') {
        return key;
      }

      node = node[part];
    }

    return typeof node === 'string' ? node : key;
  }
}
