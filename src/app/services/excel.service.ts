import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { ProductService } from './product.service';
import { SaleService } from './sale.service';
import { Produit } from '../models/domain.models';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor(
    private readonly productService: ProductService,
    private readonly saleService: SaleService
  ) {}

  async previewExcel(file: File): Promise<any[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        try {
          const arrayBuffer = e.target?.result;
          if (!(arrayBuffer instanceof ArrayBuffer)) throw new Error('Erreur de lecture');
          
          const data = new Uint8Array(arrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // { header: 1 } retourne un tableau de tableaux de valeurs
          const jsonArray = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
          if (jsonArray.length === 0) throw new Error('Fichier vide.');
          
          resolve(jsonArray);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  async importProductsWithMapping(data: any[][], mapping: Record<string, number>, hasHeaders: boolean): Promise<number> {
    let count = 0;
    const startIndex = hasHeaders ? 1 : 0;

    for (let i = startIndex; i < data.length; i++) {
      const row = data[i];
      // Skip empty rows
      if (!row || row.length === 0 || row.every((cell: any) => cell === '')) continue;

      try {
        const nom = String(row[mapping['nom']] || '').trim();
        const reference = String(row[mapping['reference']] || '').trim();

        if (nom && reference) {
          const produit: Produit = {
            nom,
            reference,
            codeBarre: String(row[mapping['codeBarre']] || '').trim() || reference,
            prixAchat: Number(row[mapping['prixAchat']] || 0),
            prixVente: Number(row[mapping['prixVente']] || 0),
            stock: Number(row[mapping['stock']] || 0),
            stockMin: Number(row[mapping['stockMin']] || 0)
          };
          await this.productService.saveProduct(produit);
          count++;
        }
      } catch (err) {
        console.warn('Ligne ignoree:', row, err);
      }
    }

    if (count === 0) {
      throw new Error('Aucun produit valide trouve. Verifiez la correspondance des colonnes.');
    }
    return count;
  }

  async exportProducts(): Promise<void> {
    const products = await this.productService.getProducts();
    const rows = products.map((produit) => ({
      nom: produit.nom,
      reference: produit.reference,
      code_barre: produit.codeBarre ?? '',
      prix_achat: produit.prixAchat,
      prix_vente: produit.prixVente,
      stock: produit.stock,
      stock_min: produit.stockMin,
      date_creation: produit.createdAt ?? ''
    }));
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');
    await this.saveExcelFile(wb, 'stockou-produits.xlsx');
  }

  async exportSales(): Promise<void> {
    const ventes = await this.saleService.getSales();
    const rows = ventes.map((vente) => ({
      id: vente.id ?? '',
      date: vente.date,
      client: vente.client?.nom ?? '',
      total_ht: vente.totalHt,
      total_ttc: vente.totalTtc,
      total_remise: vente.totalRemise,
      profit_total: vente.profitTotal
    }));
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventes');
    await this.saveExcelFile(wb, 'stockou-ventes.xlsx');
  }

  private async saveExcelFile(wb: XLSX.WorkBook, filename: string): Promise<void> {
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache
      });
      
      const { Share } = await import('@capacitor/share');
      await Share.share({
        title: 'Export Stockou',
        url: savedFile.uri,
        dialogTitle: 'Partager ou sauvegarder le fichier Excel'
      });
    } else {
      XLSX.writeFile(wb, filename);
    }
  }

  private mapImportedProduct(row: Record<string, unknown>): Produit {
    const keys = Object.keys(row);
    const getVal = (possibleKeys: string[]) => {
      const key = keys.find(k => {
        const lowerK = k.toLowerCase().trim().replace(/é/g, 'e').replace(/è/g, 'e');
        return possibleKeys.includes(lowerK);
      });
      return key ? row[key] : '';
    };

    const nom = String(getVal(['nom', 'name', 'produit', 'article'])).trim();
    const reference = String(getVal(['reference', 'ref'])).trim();

    return {
      nom,
      reference,
      codeBarre: String(getVal(['code_barre', 'codebarre', 'barcode', 'code-barres']) || reference).trim(),
      prixAchat: Number(getVal(['prix_achat', 'prix achat', 'purchase_price', 'achat']) || 0),
      prixVente: Number(getVal(['prix_vente', 'prix vente', 'selling_price', 'vente']) || 0),
      stock: Number(getVal(['stock', 'quantite', 'qte']) || 0),
      stockMin: Number(getVal(['stock_min', 'stock min', 'min_stock']) || 0),
      imagePath: String(getVal(['image_path', 'image', 'photo']) || '').trim() || null
    };
  }
}
