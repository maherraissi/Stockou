import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Produit } from '../../models/domain.models';
import { ProductService } from '../../services/product.service';
import { PhotoService } from '../../services/photo.service';
import { NavController, ToastController } from '@ionic/angular';
import { BarcodeService } from '../../services/barcode.service';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.page.html',
  styleUrls: ['./add-product.page.scss'],
  standalone: false
})
export class AddProductPage implements OnInit {
  product: Produit = {
    nom: '',
    reference: '',
    codeBarre: '',
    prixAchat: 0,
    prixVente: 0,
    stock: 0,
    stockMin: 0,
    imagePath: ''
  };
  isEditMode = false;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private photoService: PhotoService,
    private barcodeService: BarcodeService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      if (params['id']) {
        this.isEditMode = true;
        this.isLoading = true;
        this.cdr.detectChanges();
        const p = await this.productService.getProduct(Number(params['id']));
        if (p) this.product = p;
        this.isLoading = false;
        this.cdr.detectChanges();
      } else if (params['newBarcode']) {
        this.product.codeBarre = params['newBarcode'];
        this.product.reference = params['newBarcode'];
        this.cdr.detectChanges();
      }
    });
  }

  async takePicture() {
    try {
      const img = await this.photoService.takeNewPhoto();
      if (img) {
        this.product.imagePath = img;
      }
    } catch (e) {
      console.error('Photo error', e);
    }
  }

  async scanBarcode() {
    try {
      const code = await this.barcodeService.scanBarcode();
      if (code) {
        this.product.codeBarre = code;
        if (!this.product.reference) {
          this.product.reference = code;
        }
      }
    } catch (e) {
      console.error('Barcode error', e);
      const toast = await this.toastCtrl.create({
        message: 'Lecture du code-barres impossible.',
        duration: 2500,
        color: 'warning'
      });
      await toast.present();
    }
  }

  async saveProduct() {
    if (!this.product.nom || !this.product.reference) {
      const toast = await this.toastCtrl.create({
        message: 'Le nom et la reference sont obligatoires.',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
      return;
    }

    try {
      await this.productService.saveProduct(this.product);
      this.navCtrl.back();
    } catch (error) {
      console.error('Save error', error);
      const toast = await this.toastCtrl.create({
        message: 'Enregistrement impossible. Verifiez surtout la reference et le code-barres.',
        duration: 3000,
        color: 'danger'
      });
      toast.present();
    }
  }

  onStockChange() {
    if (this.product.stock !== undefined && this.product.stock !== null) {
      // Calculer le seuil d'alerte automatique (5% du stock)
      // On arrondit à l'entier supérieur
      this.product.stockMin = Math.ceil(this.product.stock * 0.05);
    }
  }
}
