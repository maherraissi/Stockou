import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ClotureCaissePageRoutingModule } from './cloture-caisse-routing.module';

import { ClotureCaissePage } from './cloture-caisse.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ClotureCaissePageRoutingModule
  ],
  declarations: [ClotureCaissePage]
})
export class ClotureCaissePageModule {}
