import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { SaleService } from './sale.service';
import { AnalyticsDashboard, ChartDataPoint, TableauDeBord, Vente } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  constructor(
    private readonly dbService: DatabaseService,
    private readonly saleService: SaleService
  ) {}

  async getFullAnalytics(): Promise<AnalyticsDashboard> {
    const [kpis, ventesParJour, ventesParMois, profitParJour, topProduits, repartitionVentes] = await Promise.all([
      this.getKPIs(),
      this.getVentesParJour(14),
      this.getVentesParMois(6),
      this.getProfitParJour(14),
      this.getTopProduits(6),
      this.getRepartitionVentes()
    ]);

    return { kpis, ventesParJour, ventesParMois, profitParJour, topProduits, repartitionVentes };
  }

  async getKPIs(): Promise<TableauDeBord> {
    const today = new Date().toISOString().slice(0, 10);

    const [todayRows, nombreVentesRows, countRows, stockValeurRows, stockFaibleRows, topRows, dernieresVentes] = await Promise.all([
      this.dbService.query<{ chiffre_affaires: number; profit: number }>(
        `SELECT COALESCE(SUM(total_ttc), 0) AS chiffre_affaires,
                COALESCE(SUM(profit_total), 0) AS profit
         FROM ventes WHERE substr(date, 1, 10) = ?`,
        [today]
      ),
      this.dbService.query<{ total: number }>(
        `SELECT COUNT(*) AS total FROM ventes WHERE substr(date, 1, 10) = ?`,
        [today]
      ),
      this.dbService.query<{ total: number }>('SELECT COUNT(*) AS total FROM produits'),
      this.dbService.query<{ valeur: number }>(
        'SELECT COALESCE(SUM(stock * prix_achat), 0) AS valeur FROM produits'
      ),
      this.dbService.query<{
        id: number; nom: string; reference: string; code_barre: string | null;
        prix_achat: number; prix_vente: number; stock: number; stock_min: number;
        image_path: string | null; created_at: string;
      }>('SELECT * FROM produits WHERE stock <= stock_min ORDER BY stock ASC, nom ASC LIMIT 8'),
      this.dbService.query<{
        produit_id: number; nom: string; qte: number; ca: number; profit: number;
      }>(
        `SELECT vi.produit_id, p.nom, SUM(vi.quantite) AS qte,
                SUM(vi.total) AS ca,
                SUM(vi.total - (p.prix_achat * vi.quantite)) AS profit
         FROM vente_items vi
         INNER JOIN produits p ON p.id = vi.produit_id
         GROUP BY vi.produit_id, p.nom
         ORDER BY qte DESC, ca DESC LIMIT 5`
      ),
      this.saleService.getSales()
    ]);

    return {
      chiffreAffairesJour: Number(todayRows[0]?.chiffre_affaires ?? 0),
      profitJour: Number(todayRows[0]?.profit ?? 0),
      nombreVentesJour: Number(nombreVentesRows[0]?.total ?? 0),
      nombreProduits: Number(countRows[0]?.total ?? 0),
      valeurStockTotal: Number(stockValeurRows[0]?.valeur ?? 0),
      produitsStockFaible: stockFaibleRows.map(r => ({
        id: r.id, nom: r.nom, reference: r.reference, codeBarre: r.code_barre,
        prixAchat: Number(r.prix_achat), prixVente: Number(r.prix_vente),
        stock: Number(r.stock), stockMin: Number(r.stock_min),
        imagePath: r.image_path, createdAt: r.created_at
      })),
      meilleuresVentes: topRows.map(r => ({
        produitId: r.produit_id, nom: r.nom,
        quantiteVendue: Number(r.qte ?? 0),
        chiffreAffaires: Number(r.ca ?? 0),
        profit: Number(r.profit ?? 0)
      })),
      dernieresVentes: dernieresVentes.slice(0, 10)
    };
  }

  async getVentesParJour(days = 14): Promise<ChartDataPoint[]> {
    const rows = await this.dbService.query<{ jour: string; total: number }>(
      `SELECT substr(date, 1, 10) AS jour, COALESCE(SUM(total_ttc), 0) AS total
       FROM ventes
       WHERE date >= datetime('now', ?)
       GROUP BY jour ORDER BY jour ASC`,
      [`-${days} days`]
    );

    return this.fillMissingDays(rows.map(r => ({ label: r.jour, value: Number(r.total) })), days);
  }

  async getVentesParMois(months = 6): Promise<ChartDataPoint[]> {
    const rows = await this.dbService.query<{ mois: string; total: number }>(
      `SELECT substr(date, 1, 7) AS mois, COALESCE(SUM(total_ttc), 0) AS total
       FROM ventes
       WHERE date >= datetime('now', ?)
       GROUP BY mois ORDER BY mois ASC`,
      [`-${months} months`]
    );

    return this.fillMissingMonths(rows.map(r => ({ label: r.mois, value: Number(r.total) })), months);
  }

  async getProfitParJour(days = 14): Promise<ChartDataPoint[]> {
    const rows = await this.dbService.query<{ jour: string; profit: number }>(
      `SELECT substr(date, 1, 10) AS jour, COALESCE(SUM(profit_total), 0) AS profit
       FROM ventes
       WHERE date >= datetime('now', ?)
       GROUP BY jour ORDER BY jour ASC`,
      [`-${days} days`]
    );

    return this.fillMissingDays(rows.map(r => ({ label: r.jour, value: Number(r.profit) })), days);
  }

  async getTopProduits(limit = 6): Promise<ChartDataPoint[]> {
    const rows = await this.dbService.query<{ nom: string; qte: number }>(
      `SELECT p.nom, SUM(vi.quantite) AS qte
       FROM vente_items vi
       INNER JOIN produits p ON p.id = vi.produit_id
       GROUP BY vi.produit_id, p.nom
       ORDER BY qte DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({ label: r.nom, value: Number(r.qte) }));
  }

  async getRepartitionVentes(): Promise<ChartDataPoint[]> {
    const rows = await this.dbService.query<{ mois: string; total: number }>(
      `SELECT substr(date, 1, 7) AS mois, COALESCE(SUM(total_ttc), 0) AS total
       FROM ventes GROUP BY mois ORDER BY mois DESC LIMIT 4`
    );
    return rows.map(r => ({
      label: this.formatMoisLabel(r.mois),
      value: Number(r.total)
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private fillMissingDays(data: ChartDataPoint[], days: number): ChartDataPoint[] {
    const map = new Map(data.map(d => [d.label, d.value]));
    const result: ChartDataPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toISOString().slice(0, 10);
      result.push({ label: this.formatDayLabel(label), value: map.get(label) ?? 0 });
    }
    return result;
  }

  private fillMissingMonths(data: ChartDataPoint[], months: number): ChartDataPoint[] {
    const map = new Map(data.map(d => [d.label, d.value]));
    const result: ChartDataPoint[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({ label: this.formatMoisLabel(label), value: map.get(label) ?? 0 });
    }
    return result;
  }

  private formatDayLabel(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  private formatMoisLabel(iso: string): string {
    const moisFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const parts = iso.split('-');
    const m = parseInt(parts[1], 10) - 1;
    return `${moisFr[m] ?? iso} ${parts[0]}`;
  }
}
