import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Produit } from '../models/domain.models';

interface ProduitRow {
  id: number;
  nom: string;
  reference: string;
  code_barre: string | null;
  prix_achat: number;
  prix_vente: number;
  stock: number;
  stock_min: number;
  image_path: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private readonly dbService: DatabaseService) {}

  async getProducts(search = ''): Promise<Produit[]> {
    const term = search.trim().toLowerCase();
    const rows = term
      ? await this.dbService.query<ProduitRow>(
        `
          SELECT * FROM produits
          WHERE LOWER(nom) LIKE ? OR LOWER(reference) LIKE ? OR LOWER(COALESCE(code_barre, '')) LIKE ?
          ORDER BY nom ASC
        `,
        [`%${term}%`, `%${term}%`, `%${term}%`]
      )
      : await this.dbService.query<ProduitRow>('SELECT * FROM produits ORDER BY nom ASC');

    return rows.map((row) => this.mapProduit(row));
  }

  async getProduct(id: number): Promise<Produit | null> {
    const rows = await this.dbService.query<ProduitRow>('SELECT * FROM produits WHERE id = ?', [id]);
    return rows[0] ? this.mapProduit(rows[0]) : null;
  }

  async getProductByBarcode(codeBarre: string): Promise<Produit | null> {
    const rows = await this.dbService.query<ProduitRow>(
      'SELECT * FROM produits WHERE code_barre = ? OR reference = ? LIMIT 1',
      [codeBarre, codeBarre]
    );

    return rows[0] ? this.mapProduit(rows[0]) : null;
  }

  async saveProduct(produit: Produit): Promise<number | undefined> {
    const payload = this.normalize(produit);

    if (payload.id) {
      await this.dbService.run(
        `
          UPDATE produits
          SET nom = ?, reference = ?, code_barre = ?, prix_achat = ?, prix_vente = ?, stock = ?, stock_min = ?, image_path = ?
          WHERE id = ?
        `,
        [
          payload.nom,
          payload.reference,
          payload.codeBarre,
          payload.prixAchat,
          payload.prixVente,
          payload.stock,
          payload.stockMin,
          payload.imagePath,
          payload.id
        ]
      );
      return payload.id;
    }

    return this.dbService.run(
      `
        INSERT INTO produits (nom, reference, code_barre, prix_achat, prix_vente, stock, stock_min, image_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payload.nom,
        payload.reference,
        payload.codeBarre,
        payload.prixAchat,
        payload.prixVente,
        payload.stock,
        payload.stockMin,
        payload.imagePath,
        new Date().toISOString()
      ]
    );
  }

  async deleteProduct(id: number): Promise<void> {
    await this.dbService.run('DELETE FROM produits WHERE id = ?', [id]);
  }

  async getLowStockProducts(): Promise<Produit[]> {
    const rows = await this.dbService.query<ProduitRow>(
      'SELECT * FROM produits WHERE stock <= stock_min ORDER BY stock ASC, nom ASC'
    );
    return rows.map((row) => this.mapProduit(row));
  }

  async getTotalProductsCount(): Promise<number> {
    const rows = await this.dbService.query<{ total: number }>('SELECT COUNT(*) AS total FROM produits');
    return rows[0]?.total ?? 0;
  }

  private mapProduit(row: ProduitRow): Produit {
    return {
      id: row.id,
      nom: row.nom,
      reference: row.reference,
      codeBarre: row.code_barre,
      prixAchat: Number(row.prix_achat ?? 0),
      prixVente: Number(row.prix_vente ?? 0),
      stock: Number(row.stock ?? 0),
      stockMin: Number(row.stock_min ?? 0),
      imagePath: row.image_path,
      createdAt: row.created_at
    };
  }

  private normalize(produit: Produit): Produit {
    return {
      ...produit,
      nom: produit.nom.trim(),
      reference: produit.reference.trim(),
      codeBarre: produit.codeBarre?.trim() || null,
      prixAchat: Number(produit.prixAchat || 0),
      prixVente: Number(produit.prixVente || 0),
      stock: Number(produit.stock || 0),
      stockMin: Number(produit.stockMin || 0),
      imagePath: produit.imagePath || null
    };
  }
}
