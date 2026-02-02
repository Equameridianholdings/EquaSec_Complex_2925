import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuardPortal } from './guard-portal';

describe('GuardPortal', () => {
  let component: GuardPortal;
  let fixture: ComponentFixture<GuardPortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuardPortal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GuardPortal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
