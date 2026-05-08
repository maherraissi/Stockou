import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ChangeDetectorRef, ViewChild, ElementRef
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DatabaseService } from '../../services/database.service';
import { DashboardService } from '../../services/dashboard.service';
import { AnalyticsDashboard } from '../../models/domain.models';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {

  // ── Chart canvas refs ────────────────────────────────────────────────────
  @ViewChild('chartVentesJour') canvasVentesJour!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartVentesMois') canvasVentesMois!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartTopProduits') canvasTopProduits!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartRepartition') canvasRepartition!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartProfitJour') canvasProfitJour!: ElementRef<HTMLCanvasElement>;

  // ── State ────────────────────────────────────────────────────────────────
  analytics: AnalyticsDashboard | null = null;
  isLoading = true;
  dbError: string | null = null;

  // ── Active period tabs ────────────────────────────────────────────────────
  activeVentesTab: string = 'semaine';

  private charts: Chart[] = [];
  private isPerformingLoad = false;
  private viewReady = false;
  private dataReady = false;

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dbService: DatabaseService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.dbService.isReady.subscribe(ready => {
      if (ready) {
        this.dbError = null;
        this.loadData();
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

  ngAfterViewInit() {
    this.viewReady = true;
    if (this.dataReady) {
      this.renderCharts();
    }
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  ionViewWillEnter() {
    if (this.dbService.isReady.value) {
      this.loadData();
    }
  }

  ionViewWillLeave() {
    this.destroyCharts();
  }

  async loadData() {
    if (this.isPerformingLoad) return;
    this.isPerformingLoad = true;
    this.isLoading = true;
    this.dbError = null;
    this.cdr.detectChanges();

    try {
      this.analytics = await this.dashboardService.getFullAnalytics();
      this.dataReady = true;

      this.isLoading = false;
      this.cdr.detectChanges();

      // Give Angular time to render canvases
      setTimeout(() => {
        if (this.viewReady) {
          this.renderCharts();
        }
      }, 100);
    } catch (err: any) {
      console.error('Erreur tableau de bord', err);
      this.dbError = err?.message ?? 'Erreur chargement';
      this.isLoading = false;
      this.cdr.detectChanges();
    } finally {
      this.isPerformingLoad = false;
    }
  }

  async retryDb() {
    this.isLoading = true;
    this.dbError = null;
    this.cdr.detectChanges();
    await this.dbService.initializePlugin();
  }

  switchVentesTab(tab: string) {
    this.activeVentesTab = tab;
    this.destroyChartById('ventesChart');
    this.buildVentesChart(tab);
  }

  // ── Chart rendering ───────────────────────────────────────────────────────

  private renderCharts() {
    if (!this.analytics) return;
    this.destroyCharts();

    this.buildVentesChart(this.activeVentesTab);
    this.buildTopProduitsChart();
    this.buildRepartitionChart();
    this.buildProfitChart();
  }

  private async buildVentesChart(tab: string) {
    let data: {label: string, value: number}[] = [];
    let type: 'line' | 'bar' = 'line';
    let title = 'Chiffre d\'affaires';

    if (tab === 'jour') { data = await this.dashboardService.getVentesParJour(1); title += ' (Aujourd\'hui)'; }
    else if (tab === 'semaine') { data = await this.dashboardService.getVentesParJour(7); title += ' (7 jours)'; }
    else if (tab === 'mois1') { data = await this.dashboardService.getVentesParJour(30); title += ' (30 jours)'; }
    else if (tab === 'mois3') { data = await this.dashboardService.getVentesParMois(3); type = 'bar'; title += ' (3 mois)'; }
    else if (tab === 'mois6') { data = await this.dashboardService.getVentesParMois(6); type = 'bar'; title += ' (6 mois)'; }
    else { data = await this.dashboardService.getVentesParJour(7); title += ' (7 jours)'; }

    const canvas = this.canvasVentesJour?.nativeElement;
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: type,
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Ventes (DT)',
          data: data.map(d => d.value),
          borderColor: '#F97316',
          backgroundColor: type === 'line' ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.7)',
          borderWidth: type === 'line' ? 2.5 : 1.5,
          pointBackgroundColor: '#F97316',
          pointRadius: 4,
          fill: true,
          tension: 0.4,
          borderRadius: type === 'bar' ? 8 : 0
        }]
      },
      options: type === 'line' ? this.lineChartOptions(title) : this.barChartOptions(title)
    });
    (chart as any)._chartId = 'ventesChart';
    this.charts.push(chart);
  }

  private buildTopProduitsChart() {
    const data = this.analytics?.topProduits ?? [];
    const canvas = this.canvasTopProduits?.nativeElement;
    if (!canvas || data.length === 0) return;

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Unités vendues',
          data: data.map(d => d.value),
          backgroundColor: [
            'rgba(16,185,129,0.75)', 'rgba(59,130,246,0.75)',
            'rgba(245,158,11,0.75)', 'rgba(239,68,68,0.75)',
            'rgba(167,139,250,0.75)', 'rgba(251,146,60,0.75)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        ...this.barChartOptions('Top produits'),
        indexAxis: 'y' as const
      }
    });
    this.charts.push(chart);
  }

  private buildRepartitionChart() {
    const data = this.analytics?.repartitionVentes ?? [];
    const canvas = this.canvasRepartition?.nativeElement;
    if (!canvas || data.length === 0) return;

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: [
            'rgba(249,115,22,0.8)', 'rgba(16,185,129,0.8)',
            'rgba(59,130,246,0.8)', 'rgba(167,139,250,0.8)'
          ],
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#e2e8f0', padding: 16, font: { size: 12 } } },
          title: { display: true, text: 'Répartition des ventes', color: '#94a3b8', font: { size: 13 } }
        },
        cutout: '60%'
      }
    });
    this.charts.push(chart);
  }

  private buildProfitChart() {
    const data = this.analytics?.profitParJour ?? [];
    const canvas = this.canvasProfitJour?.nativeElement;
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Profit (DT)',
          data: data.map(d => d.value),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#10B981',
          pointRadius: 4,
          fill: true,
          tension: 0.4
        }]
      },
      options: this.lineChartOptions('Évolution du profit')
    });
    this.charts.push(chart);
  }

  // ── Chart option factories ─────────────────────────────────────────────────

  private lineChartOptions(title: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, color: '#94a3b8', font: { size: 13 } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
      }
    };
  }

  private barChartOptions(title: string): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, color: '#94a3b8', font: { size: 13 } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
      }
    };
  }

  private destroyChartById(id: string) {
    const idx = this.charts.findIndex(c => (c as any)._chartId === id);
    if (idx !== -1) {
      this.charts[idx].destroy();
      this.charts.splice(idx, 1);
    }
  }

  private destroyCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  get devise(): string {
    return 'DT';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
