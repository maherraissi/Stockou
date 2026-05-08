import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClotureCaissePage } from './cloture-caisse.page';

const routes: Routes = [
  {
    path: '',
    component: ClotureCaissePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClotureCaissePageRoutingModule {}
