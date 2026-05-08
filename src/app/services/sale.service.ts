import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Client, ResumeVente, TableauDeBord, Vente, VenteLigne } from '../models/domain.models';

interface VenteRow {
  id: number;
  date: string;
  total_ht: number;
  total_ttc: number;
  total_remise: number;
  profit_total: number;
  client_id: number | null;
  client_nom?: string | null;
  client_telephone?: string | null;
  client_adresse?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  constructor(private readonly dbService: DatabaseService) {}

  calculerResume(lignes: VenteLigne[], remiseGlobale = 0): ResumeVente {
    const sousTotal = lignes.reduce((total, ligne) => total + (ligne.prixUnitaire * ligne.quantite), 0);
    const remiseLignes = lignes.reduce((total, ligne) => total + ligne.remise, 0);
    const remiseTotale = remiseLignes + Number(remiseGlobale || 0);

    const totalFinal = Math.max(0, sousTotal - remiseTotale);
    const profitTotal = lignes.reduce((total, ligne) => {
      const prixAchat = ligne.produit?.prixAchat ?? 0;
      const totalLigne = (ligne.prixUnitaire * ligne.quantite) - ligne.remise;
      return total + (totalLigne - (prixAchat * ligne.quantite));
    }, 0) - Number(remiseGlobale || 0);

    return {
      sousTotal,
      remiseTotale,
      totalFinal,
      profitTotal,
      quantiteArticles: lignes.reduce((total, ligne) => total + ligne.quantite, 0)
    };
  }

  async createSale(lignes: VenteLigne[], remiseGlobale = 0, client?: Client | null): Promise<number> {
    if (lignes.length === 0) {
      throw new Error('La vente doit contenir au moins un produit.');
    }

    const resume = this.calculerResume(lignes, remiseGlobale);
    const date = new Date().toISOString();

    let clientId: number | undefined;
    if (client?.nom?.trim()) {
      clientId = await this.dbService.run(
        'INSERT INTO clients (nom, telephone, adresse) VALUES (?, ?, ?)',
        [client.nom.trim(), client.telephone?.trim() || null, client.adresse?.trim() || null]
      );
    }

    const saleId = await this.dbService.run(
      `INSERT INTO ventes (date, total_ht, total_ttc, total_remise, profit_total, client_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [date, resume.sousTotal, resume.totalFinal, resume.remiseTotale, resume.profitTotal, clientId ?? null]
    );

    if (!saleId) {
      throw new Error('Impossible de creer la vente.');
    }

    for (const ligne of lignes) {
      const stockRows = await this.dbService.query<{ stock: number }>(
        'SELECT stock FROM produits WHERE id = ?',
        [ligne.produitId]
      );
      const stockDisponible = stockRows[0]?.stock ?? 0;

      if (stockDisponible < ligne.quantite) {
        throw new Error('Stock insuffisant pour finaliser la vente.');
      }

      const totalLigne = (ligne.prixUnitaire * ligne.quantite) - ligne.remise;
      await this.dbService.run(
        `INSERT INTO vente_items (vente_id, produit_id, quantite, prix_unitaire, remise, total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [saleId, ligne.produitId, ligne.quantite, ligne.prixUnitaire, ligne.remise, totalLigne]
      );

      await this.dbService.run(
        'UPDATE produits SET stock = stock - ? WHERE id = ?',
        [ligne.quantite, ligne.produitId]
      );
    }

    return saleId;
  }

  async getSales(): Promise<Vente[]> {
    const rows = await this.dbService.query<VenteRow>(
      `SELECT ventes.id, ventes.date, ventes.total_ht, ventes.total_ttc, ventes.total_remise, ventes.profit_total, ventes.client_id, clients.nom AS client_nom, clients.telephone AS client_telephone, clients.adresse AS client_adresse
       FROM ventes
       LEFT JOIN clients ON clients.id = ventes.client_id
       ORDER BY ventes.date DESC`
    );
    return rows.map((row) => this.mapSale(row));
  }

  async getSaleDetails(id: number): Promise<Vente | null> {
    const rows = await this.dbService.query<VenteRow>(
      `SELECT ventes.id, ventes.date, ventes.total_ht, ventes.total_ttc, ventes.total_remise, ventes.profit_total, ventes.client_id, clients.nom AS client_nom, clients.telephone AS client_telephone, clients.adresse AS client_adresse
       FROM ventes
       LEFT JOIN clients ON clients.id = ventes.client_id
       WHERE ventes.id = ? LIMIT 1`,
      [id]
    );

    const sale = rows[0] ? this.mapSale(rows[0]) : null;
    if (!sale) return null;

    const items = await this.dbService.query<{
      produit_id: number; quantite: number; prix_unitaire: number; remise: number; total: number;
      nom: string; reference: string; code_barre: string | null;
      prix_achat: number; prix_vente: number; stock: number; stock_min: number;
      image_path: string | null; created_at: string;
    }>(
      `SELECT vi.produit_id, vi.quantite, vi.prix_unitaire, vi.remise, vi.total,
              p.nom, p.reference, p.code_barre, p.prix_achat, p.prix_vente,
              p.stock, p.stock_min, p.image_path, p.created_at
       FROM vente_items vi
       INNER JOIN produits p ON p.id = vi.produit_id
       WHERE vi.vente_id = ? ORDER BY vi.id ASC`,
      [id]
    );

    sale.items = items.map((ligne) => ({
      produitId: ligne.produit_id,
      quantite: Number(ligne.quantite),
      prixUnitaire: Number(ligne.prix_unitaire),
      remise: Number(ligne.remise),
      total: Number(ligne.total),
      produit: {
        id: ligne.produit_id,
        nom: ligne.nom,
        reference: ligne.reference,
        codeBarre: ligne.code_barre,
        prixAchat: Number(ligne.prix_achat),
        prixVente: Number(ligne.prix_vente),
        stock: Number(ligne.stock),
        stockMin: Number(ligne.stock_min),
        imagePath: ligne.image_path,
        createdAt: ligne.created_at
      }
    }));

    return sale;
  }

  async getDashboardSummary(): Promise<TableauDeBord> {
    const today = new Date().toISOString().slice(0, 10);

    const [todayRows, nombreVentesRows, countRows, stockValeurRows, stockFaible, topRows, dernieresVentes] = await Promise.all([
      this.dbService.query<{ chiffre_affaires: number; profit: number }>(
        `SELECT COALESCE(SUM(total_ttc), 0) AS chiffre_affaires, COALESCE(SUM(profit_total), 0) AS profit
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
         FROM vente_items vi INNER JOIN produits p ON p.id = vi.produit_id
         GROUP BY vi.produit_id, p.nom ORDER BY qte DESC, ca DESC LIMIT 5`
      ),
      this.getSales()
    ]);

    return {
      chiffreAffairesJour: Number(todayRows[0]?.chiffre_affaires ?? 0),
      profitJour: Number(todayRows[0]?.profit ?? 0),
      nombreVentesJour: Number(nombreVentesRows[0]?.total ?? 0),
      nombreProduits: Number(countRows[0]?.total ?? 0),
      valeurStockTotal: Number(stockValeurRows[0]?.valeur ?? 0),
      produitsStockFaible: stockFaible.map((row) => ({
        id: row.id, nom: row.nom, reference: row.reference, codeBarre: row.code_barre,
        prixAchat: Number(row.prix_achat), prixVente: Number(row.prix_vente),
        stock: Number(row.stock), stockMin: Number(row.stock_min),
        imagePath: row.image_path, createdAt: row.created_at
      })),
      meilleuresVentes: topRows.map((row) => ({
        produitId: row.produit_id, nom: row.nom,
        quantiteVendue: Number(row.qte ?? 0),
        chiffreAffaires: Number(row.ca ?? 0),
        profit: Number(row.profit ?? 0)
      })),
      dernieresVentes: dernieresVentes.slice(0, 10)
    };
  }

  private mapSale(row: VenteRow): Vente {
    return {
      id: row.id,
      date: row.date,
      totalHt: Number(row.total_ht ?? 0),
      totalTtc: Number(row.total_ttc ?? 0),
      totalRemise: Number(row.total_remise ?? 0),
      profitTotal: Number(row.profit_total ?? 0),
      clientId: row.client_id,
      client: row.client_nom ? {
        id: row.client_id ?? undefined,
        nom: row.client_nom,
        telephone: row.client_telephone ?? null,
        adresse: row.client_adresse ?? null
      } : null
    };
  }
}
