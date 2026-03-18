import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalizeOrderComponent } from './finalize-order';

describe('FinalizeOrder', () => {
  let component: FinalizeOrderComponent;
  let fixture: ComponentFixture<FinalizeOrderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinalizeOrderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinalizeOrderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
