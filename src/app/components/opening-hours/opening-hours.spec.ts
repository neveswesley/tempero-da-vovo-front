import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpeningHours } from './opening-hours';

describe('OpeningHours', () => {
  let component: OpeningHours;
  let fixture: ComponentFixture<OpeningHours>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpeningHours]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpeningHours);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
