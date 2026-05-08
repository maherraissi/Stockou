import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { ParametresMagasin, Vente } from '../models/domain.models';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  genererFacture(vente: Vente, settings: ParametresMagasin): void {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const devise = settings.devise || 'DT';
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.nomMagasin || 'Stockou', 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Facture N ${vente.id ?? '-'}`, 14, y);
    y += 6;
    doc.text(`Date: ${new Date(vente.date).toLocaleString('fr-FR')}`, 14, y);
    y += 8;

    if (vente.client?.nom) {
      doc.text(`Client: ${vente.client.nom}`, 14, y);
      y += 6;
      if (vente.client.telephone) {
        doc.text(`Telephone: ${vente.client.telephone}`, 14, y);
        y += 6;
      }
      if (vente.client.adresse) {
        doc.text(`Adresse: ${vente.client.adresse}`, 14, y);
        y += 8;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.text('Produit', 14, y);
    doc.text('Qt', 110, y);
    doc.text('PU', 128, y);
    doc.text('Remise', 152, y);
    doc.text('Total', 182, y, { align: 'right' });
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    for (const ligne of vente.items ?? []) {
      const totalLigne = (ligne.prixUnitaire * ligne.quantite) - ligne.remise;
      doc.text(ligne.produit?.nom || `Produit #${ligne.produitId}`, 14, y);
      doc.text(String(ligne.quantite), 110, y);
      doc.text(`${ligne.prixUnitaire.toFixed(3)} ${devise}`, 128, y);
      doc.text(`${ligne.remise.toFixed(3)} ${devise}`, 152, y);
      doc.text(`${totalLigne.toFixed(3)} ${devise}`, 182, y, { align: 'right' });
      y += 7;

      if (y > 270) {
        doc.addPage();
        y = 18;
      }
    }

    y += 6;
    doc.line(120, y, 196, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total HT: ${vente.totalHt.toFixed(3)} ${devise}`, 196, y, { align: 'right' });
    y += 7;
    doc.text(`Remise: ${vente.totalRemise.toFixed(3)} ${devise}`, 196, y, { align: 'right' });
    y += 7;
    doc.text(`Total TTC: ${vente.totalTtc.toFixed(3)} ${devise}`, 196, y, { align: 'right' });
    y += 7;
    doc.text(`Profit: ${vente.profitTotal.toFixed(3)} ${devise}`, 196, y, { align: 'right' });

    doc.save(`facture-${vente.id ?? 'vente'}.pdf`);
  }
}
