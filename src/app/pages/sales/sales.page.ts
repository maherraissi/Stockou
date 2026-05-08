import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Vente } from '../../models/domain.models';
import { SaleService } from '../../services/sale.service';
import { DatabaseService } from '../../services/database.service';
import { InvoiceService } from '../../services/invoice.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.page.html',
  styleUrls: ['./sales.page.scss'],
  standalone: false
})
export class SalesPage implements OnInit {
  sales: Vente[] = [];
  filteredSales: Vente[] = [];
  searchQuery = '';
  isLoading = true;
  private isPerformingLoad = false;

  constructor(
    private readonly saleService: SaleService,
    private readonly dbService: DatabaseService,
    private readonly invoiceService: InvoiceService,
    private readonly settingsService: SettingsService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.dbService.isReady.subscribe(ready => {
      if (ready) {
        this.loadSales();
      }
    });
  }

  ionViewWillEnter() {
    if (this.dbService.isReady.value) {
      this.loadSales();
    }
  }

  async loadSales() {
    if (this.isPerformingLoad) return;

    this.isPerformingLoad = true;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      this.sales = await this.saleService.getSales();
      this.filterSales();
    } catch (error) {
      console.error('Error loading sales', error);
    } finally {
      this.isLoading = false;
      this.isPerformingLoad = false;
      this.cdr.detectChanges();
    }
  }

  filterSales(event?: any) {
    if (event?.detail?.value !== undefined) {
      this.searchQuery = event.detail.value ?? '';
    }
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredSales = [...this.sales];
    } else {
      this.filteredSales = this.sales.filter(s =>
        ('#' + s.id).includes(query)
        || (s.client?.nom || '').toLowerCase().includes(query)
        || (s.date || '').includes(query)
      );
    }
    this.cdr.detectChanges();
  }

  async exportInvoice(event: Event, saleId?: number) {
    event.stopPropagation();
    if (!saleId) return;

    const sale = await this.saleService.getSaleDetails(saleId);
    if (!sale) return;

    const settings = await this.settingsService.getSettings();
    this.invoiceService.genererFacture(sale, settings);
  }
}
