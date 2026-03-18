import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryZones } from './delivery-zones';

describe('DeliveryZones', () => {
  let component: DeliveryZones;
  let fixture: ComponentFixture<DeliveryZones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryZones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryZones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
