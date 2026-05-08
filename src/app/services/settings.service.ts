import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { ParametresMagasin } from '../models/domain.models';

interface ParametresRow {
  nom_magasin: string;
  devise: string;
  logo_path: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getSettings(): Promise<ParametresMagasin> {
    const rows = await this.dbService.query<ParametresRow>(
      'SELECT nom_magasin, devise, logo_path FROM parametres WHERE id = 1'
    );

    const row = rows[0];
    return {
      nomMagasin: row?.nom_magasin ?? 'Stockou',
      devise: row?.devise ?? 'DT',
      logoPath: row?.logo_path ?? null
    };
  }

  async saveSettings(settings: ParametresMagasin): Promise<void> {
    await this.dbService.run(
      `
        UPDATE parametres
        SET nom_magasin = ?, devise = ?, logo_path = ?
        WHERE id = 1
      `,
      [settings.nomMagasin.trim(), settings.devise.trim() || 'DT', settings.logoPath || null]
    );
  }
}
