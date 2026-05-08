import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Cloture } from '../models/domain.models';

@Injectable({
  providedIn: 'root'
})
export class ClotureService {
  constructor(private readonly dbService: DatabaseService) {}

  async getDerniereCloture(): Promise<Cloture | null> {
    const rows = await this.dbService.query<any>(
      'SELECT * FROM clotures ORDER BY date_cloture DESC LIMIT 1'
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      dateOuverture: r.date_ouverture,
      dateCloture: r.date_cloture,
      totalVentes: r.total_ventes,
      totalProfit: r.total_profit,
      nombreVentes: r.nombre_ventes,
      montantTheorique: r.montant_theorique,
      montantSaisi: r.montant_saisi,
      ecart: r.ecart
    };
  }

  async getSessionActuelleStats(): Promise<{ 
    dateOuverture: string;
    totalVentes: number; 
    totalProfit: number; 
    nombreVentes: number;
  }> {
    const lastCloture = await this.getDerniereCloture();
    const dateOuverture = lastCloture ? lastCloture.dateCloture : new Date(0).toISOString();

    const query = `
      SELECT 
        SUM(total_ttc) as totalVentes,
        SUM(profit_total) as totalProfit,
        COUNT(id) as nombreVentes
      FROM ventes 
      WHERE date > ?
    `;

    const rows = await this.dbService.query<any>(query, [dateOuverture]);
    const r = rows[0] || {};
    
    return {
      dateOuverture,
      totalVentes: r.totalVentes || 0,
      totalProfit: r.totalProfit || 0,
      nombreVentes: r.nombreVentes || 0
    };
  }

  async cloturerCaisse(montantSaisi?: number): Promise<number> {
    const stats = await this.getSessionActuelleStats();
    if (stats.nombreVentes === 0) {
      throw new Error('Aucune vente a cloturer pour cette session.');
    }

    const ecart = montantSaisi !== undefined ? montantSaisi - stats.totalVentes : 0;
    const dateCloture = new Date().toISOString();

    const result = await this.dbService.run(
      `INSERT INTO clotures (
        date_ouverture, date_cloture, total_ventes, total_profit, 
        nombre_ventes, montant_theorique, montant_saisi, ecart
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stats.dateOuverture,
        dateCloture,
        stats.totalVentes,
        stats.totalProfit,
        stats.nombreVentes,
        stats.totalVentes, // montant theorique (on suppose que toutes les ventes sont en especes pour l'instant)
        montantSaisi ?? stats.totalVentes,
        ecart
      ]
    );

    if (!result) {
      throw new Error('Erreur lors de la cloture de la caisse');
    }

    return result;
  }
}
