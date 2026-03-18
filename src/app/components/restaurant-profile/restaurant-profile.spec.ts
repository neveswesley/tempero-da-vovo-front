import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantProfilePublicComponent } from './restaurant-profile';

describe('RestaurantProfile', () => {
  let component: RestaurantProfilePublicComponent;
  let fixture: ComponentFixture<RestaurantProfilePublicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantProfilePublicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RestaurantProfilePublicComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
