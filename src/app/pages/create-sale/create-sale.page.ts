import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { Produit, VenteLigne } from '../../models/domain.models';
import { ProductService } from '../../services/product.service';
import { SaleService } from '../../services/sale.service';
import { NavController, ToastController } from '@ionic/angular';
import { DatabaseService } from '../../services/database.service';
import { BarcodeService } from '../../services/barcode.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-create-sale',
  templateUrl: './create-sale.page.html',
  styleUrls: ['./create-sale.page.scss'],
  standalone: false
})
export class CreateSalePage implements OnInit {
  products: Produit[] = [];
  selectedProducts: VenteLigne[] = [];
  searchQuery = '';
  filteredProducts: Produit[] = [];
  globalDiscount = 0;
  clientNom = '';
  clientTelephone = '';
  clientAdresse = '';
  
  isActive = false;
  private barcodeBuffer = '';
  private lastKeyTime = 0;

  constructor(
    private readonly productService: ProductService,
    private readonly saleService: SaleService,
    private readonly barcodeService: BarcodeService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController,
    private readonly dbService: DatabaseService,
    private readonly cdr: ChangeDetectorRef,
    private readonly route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.loadProducts();
    this.route.queryParams.subscribe(params => {
      if (params['scanCode']) {
        const code = params['scanCode'];
        // On attend que les produits soient charges
        this.dbService.isReady.subscribe(async ready => {
          if (ready && this.products.length > 0) {
            this.addScannedProduct(code);
          } else if (ready) {
            this.products = await this.productService.getProducts();
            this.addScannedProduct(code);
          }
        });
      }
    });
  }

  ionViewWillEnter() {
    this.loadProducts();
  }

  ionViewDidEnter() {
    this.isActive = true;
  }

  ionViewWillLeave() {
    this.isActive = false;
  }

  private async addScannedProduct(code: string) {
    if (this.searchQuery === code) {
      this.searchQuery = '';
      this.filteredProducts = [...this.products];
    }

    const produit = this.products.find(p => p.codeBarre === code || p.reference === code);
    if (!produit) {
      const toast = await this.toastCtrl.create({
        message: 'Produit introuvable (Code: ' + code + ')',
        duration: 2500,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.addProductToSale(produit);
    const toast = await this.toastCtrl.create({
      message: produit.nom + ' ajouté.',
      duration: 1000,
      color: 'success'
    });
    toast.present();
  }

  async loadProducts() {
    if (this.dbService.isReady.value) {
      this.products = await this.productService.getProducts();
      this.filteredProducts = [...this.products];
      this.cdr.detectChanges();
    } else {
      this.dbService.isReady.subscribe(async ready => {
        if (ready) {
          this.products = await this.productService.getProducts();
          this.filteredProducts = [...this.products];
          this.cdr.detectChanges();
        }
      });
    }
  }

  filterProducts(event?: any) {
    if (event && event.detail && event.detail.value !== undefined) {
      this.searchQuery = event.detail.value;
    }
    
    if (!this.searchQuery || this.searchQuery.trim() === '') {
      this.filteredProducts = [...this.products];
      return;
    }
    
    const query = this.searchQuery.toLowerCase().trim();
    
    // On récupère tous les produits qui correspondent (soit commence par, soit contient)
    const matches = this.products.filter(p => {
      const nom = (p.nom || '').toLowerCase();
      const ref = (p.reference || '').toLowerCase();
      const code = (p.codeBarre || '').toLowerCase();
      return nom.includes(query) || ref.includes(query) || code.includes(query);
    });

    // On trie pour mettre ceux qui COMMENCENT par la query en premier
    this.filteredProducts = matches.sort((a, b) => {
      const aStarts = (a.nom || '').toLowerCase().startsWith(query) ? 1 : 0;
      const bStarts = (b.nom || '').toLowerCase().startsWith(query) ? 1 : 0;
      return bStarts - aStarts; // 1 si b commence et pas a, -1 si a commence et pas b
    });

    this.cdr.detectChanges();
  }

  addProductToSale(product: Produit) {
    if (product.stock <= 0) {
      this.toastCtrl.create({
        message: 'Attention: Ce produit est en rupture de stock (0).',
        duration: 2500,
        color: 'warning'
      }).then(t => t.present());
      return; // Ne pas l'ajouter si le stock est à 0
    }

    const existing = this.selectedProducts.find(item => item.produitId === product.id);
    if (existing) {
      if (existing.quantite < product.stock) {
        existing.quantite++;
      } else {
        this.toastCtrl.create({
          message: 'Stock maximum atteint pour ce produit.',
          duration: 2000,
          color: 'warning'
        }).then(t => t.present());
      }
    } else {
      this.selectedProducts.push({
        produitId: product.id!,
        quantite: 1,
        prixUnitaire: product.prixVente,
        remise: 0,
        produit: product
      });
    }
    this.searchQuery = '';
    this.filterProducts();
    this.cdr.detectChanges();
  }

  removeProductFromSale(index: number) {
    this.selectedProducts.splice(index, 1);
  }

  async scanAndAddProduct() {
    try {
      const code = await this.barcodeService.scanBarcode();
      if (!code) {
        return;
      }

      await this.addScannedProduct(code);
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: 'Le scanner n a pas pu lire le code-barres.',
        duration: 2500,
        color: 'warning'
      });
      await toast.present();
    }
  }

  updateQuantity(item: VenteLigne, delta: number) {
    if (item.quantite + delta > 0 && item.quantite + delta <= (item.produit?.stock || 0)) {
      item.quantite += delta;
    }
  }

  getTotalPrice(): number {
    return this.saleService.calculerResume(this.selectedProducts, this.globalDiscount).totalFinal;
  }

  getSousTotal(): number {
    return this.saleService.calculerResume(this.selectedProducts, this.globalDiscount).sousTotal;
  }

  getProfit(): number {
    return this.saleService.calculerResume(this.selectedProducts, this.globalDiscount).profitTotal;
  }

  async finishSale() {
    if (this.selectedProducts.length === 0) return;

    try {
      await this.saleService.createSale(this.selectedProducts, this.globalDiscount, {
        nom: this.clientNom,
        telephone: this.clientTelephone,
        adresse: this.clientAdresse
      });
      
      const toast = await this.toastCtrl.create({
        message: 'Vente enregistree avec succes.',
        duration: 2000,
        color: 'success'
      });
      toast.present();
      
      this.selectedProducts = [];
      this.globalDiscount = 0;
      this.clientNom = '';
      this.clientTelephone = '';
      this.clientAdresse = '';
      this.loadProducts();
      
    } catch (error: any) {
      console.error("Sale Error:", error);
      const toast = await this.toastCtrl.create({
        message: 'Erreur: ' + (error?.message || 'Impossible de finaliser la vente.'),
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }
}
