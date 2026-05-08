import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CreateSalePage } from './create-sale.page';

const routes: Routes = [
  {
    path: '',
    component: CreateSalePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CreateSalePageRoutingModule {}
