import { Component, OnInit } from '@angular/core';
import { ExcelService } from '../../services/excel.service';
import { ToastController } from '@ionic/angular';
import { SettingsService } from '../../services/settings.service';
import { ParametresMagasin } from '../../models/domain.models';
import { PhotoService } from '../../services/photo.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {
  isLoading = false;
  settings: ParametresMagasin = {
    nomMagasin: 'Stockou',
    devise: 'DT',
    logoPath: null
  };

  // ── Import Mapping State ──────────────────────────────────────────────────
  isMappingModalOpen = false;
  excelData: any[][] = [];
  excelHeaders: string[] = [];
  hasHeaders = true;

  mapping: Record<string, number> = {
    nom: -1,
    reference: -1,
    codeBarre: -1,
    prixAchat: -1,
    prixVente: -1,
    stock: -1,
    stockMin: -1
  };

  constructor(
    private readonly excelService: ExcelService,
    private readonly settingsService: SettingsService,
    private readonly photoService: PhotoService,
    private readonly toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    this.settings = await this.settingsService.getSettings();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoading = true;
      try {
        this.excelData = await this.excelService.previewExcel(file);
        this.updateHeadersPreview();
        this.autoMapColumns();
        this.isMappingModalOpen = true;
      } catch (error) {
        console.error('Preview error', error);
        const toast = await this.toastCtrl.create({
          message: 'Impossible de lire le fichier Excel.',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
      } finally {
        this.isLoading = false;
        event.target.value = ''; // Reset file input
      }
    }
  }

  updateHeadersPreview() {
    if (this.excelData.length === 0) return;
    const firstRow = this.excelData[0];
    if (this.hasHeaders) {
      this.excelHeaders = firstRow.map(String);
    } else {
      this.excelHeaders = firstRow.map((val: any, index: number) => `Colonne ${index + 1} (Ex: ${String(val).substring(0, 20)})`);
    }
  }

  onHasHeadersChange() {
    this.updateHeadersPreview();
    this.autoMapColumns();
  }

  autoMapColumns() {
    const headers = this.excelHeaders.map(h => h.toLowerCase());
    Object.keys(this.mapping).forEach(k => this.mapping[k] = -1);

    const findMatch = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    if (this.hasHeaders) {
      this.mapping['nom'] = findMatch(['nom', 'produit', 'article', 'designation', 'description']);
      this.mapping['reference'] = findMatch(['ref', 'code_article']);
      this.mapping['codeBarre'] = findMatch(['code_barre', 'barcode', 'ean', 'code']);
      this.mapping['prixAchat'] = findMatch(['achat', 'purchase']);
      this.mapping['prixVente'] = findMatch(['vente', 'pv', 'selling', 'prix']);
      this.mapping['stock'] = findMatch(['stock', 'qte', 'quantite']);
      this.mapping['stockMin'] = findMatch(['min']);
    } else {
      this.mapping['nom'] = 0;
      this.mapping['reference'] = 1;
      this.mapping['codeBarre'] = 2;
      this.mapping['prixVente'] = 3;
      this.mapping['stock'] = 4;
    }
  }

  cancelImport() {
    this.isMappingModalOpen = false;
    this.excelData = [];
  }

  async confirmImport() {
    if (this.mapping['nom'] === -1 || this.mapping['reference'] === -1) {
      const toast = await this.toastCtrl.create({
        message: 'Le Nom et la Reference sont obligatoires. Veuillez les lier.',
        duration: 3000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    this.isMappingModalOpen = false;
    this.isLoading = true;
    try {
      const count = await this.excelService.importProductsWithMapping(this.excelData, this.mapping, this.hasHeaders);
      const toast = await this.toastCtrl.create({
        message: `${count} produit(s) importe(s) avec succes.`,
        duration: 3000,
        color: 'success'
      });
      toast.present();
    } catch (error: any) {
      console.error('Import error', error);
      const toast = await this.toastCtrl.create({
        message: 'Erreur: ' + (error?.message || 'L importation a echoue.'),
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    } finally {
      this.isLoading = false;
      this.excelData = [];
    }
  }

  async exportData() {
    this.isLoading = true;
    try {
      await this.excelService.exportProducts();
      const toast = await this.toastCtrl.create({
        message: 'Export des produits termine.',
        duration: 3000,
        color: 'success'
      });
      toast.present();
    } catch (error) {
      console.error('Export error', error);
      const toast = await this.toastCtrl.create({
        message: 'Erreur pendant l export des produits.',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  async exportSales() {
    this.isLoading = true;
    try {
      await this.excelService.exportSales();
      const toast = await this.toastCtrl.create({
        message: 'Export des ventes termine.',
        duration: 3000,
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Erreur pendant l export des ventes.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isLoading = false;
    }
  }

  async saveSettings() {
    await this.settingsService.saveSettings(this.settings);
    const toast = await this.toastCtrl.create({
      message: 'Parametres enregistres.',
      duration: 2500,
      color: 'success'
    });
    await toast.present();
  }

  async chooseLogo() {
    const photo = await this.photoService.takeNewPhoto();
    if (photo) {
      this.settings.logoPath = photo;
    }
  }
}
