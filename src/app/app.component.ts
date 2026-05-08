import { Component, OnInit, HostListener } from '@angular/core';
import { DatabaseService } from './services/database.service';
import { SettingsService } from './services/settings.service';
import { ProductService } from './services/product.service';
import { BarcodeService } from './services/barcode.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  nomMagasin = 'Stockou';
  private barcodeBuffer = '';
  private lastKeyTime = 0;

  constructor(
    private readonly dbService: DatabaseService,
    private readonly settingsService: SettingsService,
    private readonly productService: ProductService,
    private readonly barcodeService: BarcodeService,
    private readonly router: Router,
    private readonly toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.dbService.initializePlugin();
    if (this.dbService.isReady.value) {
      const settings = await this.settingsService.getSettings();
      this.nomMagasin = settings.nomMagasin;
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    // Ignore input events to avoid blocking normal typing, unless it's very fast
    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    const currentTime = new Date().getTime();
    
    if (event.key === 'Enter') {
      if (this.barcodeBuffer.length > 2) {
        this.processGlobalBarcode(this.barcodeBuffer);
        // Si c'est un input, on essaye de le vider si la saisie etait ultra-rapide
        if (isInput && (target as HTMLInputElement).value === this.barcodeBuffer) {
           (target as HTMLInputElement).value = '';
        }
      }
      this.barcodeBuffer = '';
      return;
    }

    if (currentTime - this.lastKeyTime > 50) {
      this.barcodeBuffer = '';
    }

    if (event.key.length === 1) {
      this.barcodeBuffer += event.key;
      this.lastKeyTime = currentTime;
    }
  }

  async scanGlobal() {
    try {
      const code = await this.barcodeService.scanBarcode();
      if (code) {
        this.processGlobalBarcode(code);
      }
    } catch (e) {
      console.error(e);
      const toast = await this.toastCtrl.create({
        message: 'Lecture du code-barres impossible.',
        duration: 2500, color: 'warning'
      });
      toast.present();
    }
  }

  async processGlobalBarcode(barcode: string) {
    if (!this.dbService.isReady.value) return;

    const products = await this.productService.getProducts();
    const existing = products.find(p => p.codeBarre === barcode || p.reference === barcode);

    if (existing) {
      // Redirection vers la vente avec le code dans l'URL pour declencher l'ajout
      this.router.navigate(['/create-sale'], { queryParams: { scanCode: barcode, t: Date.now() } });
    } else {
      // Produit inconnu, on l'ajoute
      const toast = await this.toastCtrl.create({
        message: 'Nouveau code-barres ! Veuillez creer le produit.',
        duration: 2500, color: 'primary'
      });
      toast.present();
      this.router.navigate(['/products/add'], { queryParams: { newBarcode: barcode } });
    }
  }
}
