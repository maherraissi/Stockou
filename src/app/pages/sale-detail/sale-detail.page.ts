import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Vente } from '../../models/domain.models';
import { SaleService } from '../../services/sale.service';
import { NavController } from '@ionic/angular';
import { InvoiceService } from '../../services/invoice.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-sale-detail',
  templateUrl: './sale-detail.page.html',
  styleUrls: ['./sale-detail.page.scss'],
  standalone: false
})
export class SaleDetailPage implements OnInit {
  sale: Vente | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private saleService: SaleService,
    private navCtrl: NavController,
    private invoiceService: InvoiceService,
    private settingsService: SettingsService
  ) { }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSaleDetails(parseInt(id, 10));
    } else {
      this.navCtrl.back();
    }
  }

  async loadSaleDetails(id: number) {
    this.isLoading = true;
    try {
      this.sale = await this.saleService.getSaleDetails(id);
    } catch (error) {
      console.error('Error loading sale details', error);
    } finally {
      this.isLoading = false;
    }
  }

  async exportPdf() {
    if (!this.sale) return;
    const settings = await this.settingsService.getSettings();
    this.invoiceService.genererFacture(this.sale, settings);
  }

  goBack() {
    this.navCtrl.back();
  }
}
