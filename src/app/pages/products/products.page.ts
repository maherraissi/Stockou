import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Produit } from '../../models/domain.models';
import { ProductService } from '../../services/product.service';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: false
})
export class ProductsPage implements OnInit {
  products: Produit[] = [];
  filteredProducts: Produit[] = [];
  searchQuery = '';
  isLoading = true;
  dbError: string | null = null;
  private isPerformingLoad = false;

  constructor(
    private readonly productService: ProductService,
    private readonly dbService: DatabaseService,
    private readonly alertCtrl: AlertController,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.dbService.isReady.subscribe(ready => {
      console.log('Products received DB Ready:', ready);
      if (ready) {
        this.dbError = null;
        this.loadProducts();
      }
    });

    this.dbService.lastError.subscribe(err => {
      if (err) {
        this.dbError = err;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ionViewWillEnter() {
    if (this.dbService.isReady.value) {
      this.loadProducts();
    }
  }

  async loadProducts() {
    if (this.isPerformingLoad) {
      console.log('Products load already in progress, skipping');
      return;
    }
    
    this.isPerformingLoad = true;
    this.isLoading = true;
    this.dbError = null;
    this.cdr.detectChanges();

    try {
      this.products = await this.productService.getProducts();
      this.filterProducts();
    } catch (error) {
      console.error('Error loading products', error);
    } finally {
      this.isLoading = false;
      this.isPerformingLoad = false;
      this.cdr.detectChanges();
    }
  }

  async retryDb() {
    this.isLoading = true;
    this.dbError = null;
    this.cdr.detectChanges();
    await this.dbService.initializePlugin();
  }

  filterProducts(event?: any) {
    if (event?.detail?.value !== undefined) {
      this.searchQuery = event.detail.value ?? '';
    }
    const query = this.searchQuery.trim().toLowerCase();
    
    if (!query) {
      this.filteredProducts = [...this.products];
    } else {
      const matches = this.products.filter((p) =>
        (p.nom || '').toLowerCase().includes(query)
        || (p.reference || '').toLowerCase().includes(query)
        || (p.codeBarre || '').toLowerCase().includes(query)
      );

      this.filteredProducts = matches.sort((a, b) => {
        const aStarts = (a.nom || '').toLowerCase().startsWith(query) ? 1 : 0;
        const bStarts = (b.nom || '').toLowerCase().startsWith(query) ? 1 : 0;
        return bStarts - aStarts;
      });
    }
    this.cdr.detectChanges();
  }

  async deleteProduct(id?: number) {
    if (!id) return;
    const alert = await this.alertCtrl.create({
      header: 'Supprimer le produit',
      message: 'Cette action retirera le produit du catalogue local.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Supprimer',
          role: 'destructive',
          handler: async () => {
            await this.productService.deleteProduct(id);
            await this.loadProducts();
          }
        }
      ]
    });
    await alert.present();
  }
}
