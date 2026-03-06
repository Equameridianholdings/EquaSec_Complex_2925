import { MatDialog } from '@angular/material/dialog';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BookVisitor } from './visitors/book-visitor/book-visitor';
import { UpdateProfile } from '../update-profile/update-profile';
import { ChangePin } from '../update-profile/change-pin/change-pin';
import { StorageService } from '../services/storage.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { Loader } from "../components/loader/loader";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Loader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnDestroy {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  menuOpen = false;

  tabs = [
    { label: 'Visitors', path: '/dashboard/visitors', exact: true },
    { label: 'Unit', path: '/dashboard/units', exact: false },
    { label: 'Vehicles', path: '/dashboard/vehicles', exact: false },
  ];

  protected isHoldingSos = false;
  protected showSosSuccess = false;
  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;

  constructor(private readonly router: Router) {}

  dialog = inject(MatDialog);
  storage = inject(StorageService);

  openBookingModal() {
    this.dialog.open(BookVisitor);
  }

  openChangePinModal() {
    this.dialog.open(ChangePin);
  }

  openUpdateDetailsModal() {
    this.dialog.open(UpdateProfile);
  }

  protected startSosHold(event: Event): void {
    event.preventDefault();
    if (this.isHoldingSos || this.showSosSuccess) {
      return;
    }

    this.isHoldingSos = true;
    this.clearSosHoldTimer();
    this.sosHoldTimer = window.setTimeout(() => {
      this.triggerSosSuccess();
    }, 5000);
  }

  protected endSosHold(): void {
    if (!this.isHoldingSos) {
      return;
    }
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
  }

  private triggerSosSuccess(): void {
    this.isHoldingSos = false;
    this.clearSosHoldTimer();
    this.showSosSuccess = true;
    this.clearSosAutoCloseTimer();
    this.sosAutoCloseTimer = window.setTimeout(() => {
      window.location.reload();
    }, 5000);
  }

  private clearSosHoldTimer(): void {
    if (this.sosHoldTimer !== null) {
      window.clearTimeout(this.sosHoldTimer);
      this.sosHoldTimer = null;
    }
  }

  private clearSosAutoCloseTimer(): void {
    if (this.sosAutoCloseTimer !== null) {
      window.clearTimeout(this.sosAutoCloseTimer);
      this.sosAutoCloseTimer = null;
    }
  }

  protected get greetingLabel(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }

  logout() {
    this.submitting.update(() => true);
    this.storage.removeItem('bearer-token');
    this.submitting.update(() => false);
    this.router.navigate(['/login']);
  }

  public ngOnDestroy(): void {
    this.clearSosHoldTimer();
    this.clearSosAutoCloseTimer();
  }
}
