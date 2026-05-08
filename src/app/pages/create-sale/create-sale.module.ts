import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CreateSalePageRoutingModule } from './create-sale-routing.module';

import { CreateSalePage } from './create-sale.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CreateSalePageRoutingModule
  ],
  declarations: [CreateSalePage]
})
export class CreateSalePageModule {}
