import { Component, OnInit } from '@angular/core';
import { NavController, ToastController, AlertController } from '@ionic/angular';
import { ClotureService } from '../../services/cloture.service';

@Component({
  selector: 'app-cloture-caisse',
  templateUrl: './cloture-caisse.page.html',
  styleUrls: ['./cloture-caisse.page.scss'],
  standalone: false
})
export class ClotureCaissePage implements OnInit {
  isLoading = true;
  stats = { dateOuverture: '', totalVentes: 0, totalProfit: 0, nombreVentes: 0 };
  montantSaisi: number | null = null;
  
  constructor(
    private readonly clotureService: ClotureService,
    private readonly toastCtrl: ToastController,
    private readonly alertCtrl: AlertController,
    private readonly navCtrl: NavController
  ) { }

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    this.isLoading = true;
    try {
      this.stats = await this.clotureService.getSessionActuelleStats();
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  async doCloture() {
    if (this.stats.nombreVentes === 0) {
      const toast = await this.toastCtrl.create({
        message: 'Aucune vente à clôturer.',
        duration: 2000, color: 'warning'
      });
      toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Confirmation',
      message: 'Voulez-vous vraiment clôturer la caisse ? Cette action remettra à zéro le compteur des ventes pour la prochaine session.',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Clôturer',
          handler: async () => {
            try {
              await this.clotureService.cloturerCaisse(this.montantSaisi || this.stats.totalVentes);
              const toast = await this.toastCtrl.create({
                message: 'Caisse clôturée avec succès.',
                duration: 3000, color: 'success'
              });
              toast.present();
              this.navCtrl.navigateBack('/dashboard');
            } catch (err: any) {
              const toast = await this.toastCtrl.create({
                message: err.message || 'Erreur de clôture',
                duration: 3000, color: 'danger'
              });
              toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
