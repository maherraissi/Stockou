import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateSalePage } from './create-sale.page';

describe('CreateSalePage', () => {
  let component: CreateSalePage;
  let fixture: ComponentFixture<CreateSalePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateSalePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
