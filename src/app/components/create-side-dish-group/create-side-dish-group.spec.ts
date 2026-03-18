import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateSideDishGroup } from './create-side-dish-group';

describe('CreateSideDishGroup', () => {
  let component: CreateSideDishGroup;
  let fixture: ComponentFixture<CreateSideDishGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSideDishGroup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateSideDishGroup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
