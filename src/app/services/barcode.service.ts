import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  async scanBarcode(): Promise<string | null> {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      return window.prompt('Saisissez le code-barres du produit')?.trim() || null;
    }

    const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning');
    const permission = await BarcodeScanner.requestPermissions();
    if (permission.camera !== 'granted' && permission.camera !== 'limited') {
      throw new Error('Autorisation camera refusee.');
    }

    const result = await BarcodeScanner.scan();
    return result.barcodes[0]?.rawValue?.trim() || null;
  }
}
