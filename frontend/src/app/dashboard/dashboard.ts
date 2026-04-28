import { MatDialog } from '@angular/material/dialog';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BookVisitor } from './visitors/book-visitor/book-visitor';
import { UpdateProfile } from '../update-profile/update-profile';
import { ChangePin } from '../update-profile/change-pin/change-pin';
import { GenerateLinkModal } from './visitors/generate-link-modal/generate-link-modal';
import { StorageService } from '../services/storage.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Loader } from '../components/loader/loader';
import { Paygate } from '../components/paygate/paygate';
import { DataService } from '../services/data.service';
import { UserDTO } from '../interfaces/userDTO';
import { ResponseBody } from '../interfaces/ResponseBody';
import { error } from 'console';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Loader],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  menuOpen = false;
  currentUser = signal<UserDTO>({
    cellNumber: '',
    confirmPassword: '',
    emailAddress: '',
    movedOut: false,
    name: '',
    password: '',
    profilePhoto: '',
    surname: '',
    type: [],
    visitorsTokens: 0,
  });

  tabs = [
    { label: 'Visitors', path: '/dashboard/visitors', exact: true },
    { label: 'Unit', path: '/dashboard/units', exact: false },
    { label: 'Vehicles', path: '/dashboard/vehicles', exact: false },
  ];

  protected isHoldingSos = false;
  protected showSosSuccess = false;
  private sosHoldTimer: number | null = null;
  private sosAutoCloseTimer: number | null = null;
  dialog = inject(MatDialog);
  storage = inject(StorageService);
  dataService = inject(DataService);

  constructor(private readonly router: Router) {}
  ngOnInit(): void {
    this.dataService.get<ResponseBody>('user/current/').subscribe({
      next: (res) => this.currentUser.update(() => res.payload as UserDTO),
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }

  openBookingModal() {
    if (this.currentUser().visitorsTokens === 0) {
      this._snackBar.open('Free trail expired!', 'close', {
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      return;
    }

    this.dialog.open(BookVisitor, {
      data: {
        data: {},
        endpoint: 'visitor/',
      },
    });
  }

  openGenerateLinkModal() {
    if (this.currentUser().visitorsTokens === 0) {
      this._snackBar.open('Free trail expired!', 'close', {
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      });
      return;
    }

    this.dialog.open(GenerateLinkModal);
  }

  openChangePinModal() {
    this.dialog.open(ChangePin);
  }

  openUpdateDetailsModal() {
    this.dialog.open(UpdateProfile);
  }

  openPaymentModal() {
    this.dialog.open(Paygate, {
      data: {
        currentUser: this.currentUser(),
      },
    });
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
