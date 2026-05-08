import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClotureCaissePage } from './cloture-caisse.page';

describe('ClotureCaissePage', () => {
  let component: ClotureCaissePage;
  let fixture: ComponentFixture<ClotureCaissePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClotureCaissePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
