import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { ResponseBody } from '../interfaces/ResponseBody';
import { DataService } from '../services/data.service';
import { Loader } from "../components/loader/loader";
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-forget-password',
  imports: [Loader, FormsModule],
  templateUrl: './forget-password.html',
  styleUrl: '../dashboard/dashboard.css',
})
export class ForgetPassword implements OnInit {
  token = signal("");
  email = signal("")
  route = inject(ActivatedRoute);
  router = inject(Router);
  ngOnInit(): void {
    this.token.update(() => this.route.snapshot.params['token'] as string);
    this.email.update(() => this.route.snapshot.params['email'] as string);
  }
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);

  newPassword: number[] = [0, 0, 0, 0, 0, 0];
  confirmPassword: number[] = [0, 0, 0, 0, 0, 0];
  changePinError: string = '';
  changePinSuccess: string = '';

  onPinInput(event: Event, index: number, group: 'old' | 'new' | 'confirm'): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    const digit = (input.value || '').replace(/\D/g, '').slice(0, 1);
    input.value = digit;
    if (group === 'new') this.newPassword[index] = digit as unknown as number;
    if (group === 'confirm') this.confirmPassword[index] = digit as unknown as number;
    if (digit && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  onPinKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling;
      if (prev instanceof HTMLInputElement) {
        prev.focus();
        prev.value = '';
      }
    }
  }

  saveChanges() {
    this.submitting.update(() => true);
    const newP = this.newPassword.join().replaceAll(',', '');
    const confirmedP = this.confirmPassword.join().replaceAll(',', '');
    const isValid = newP == confirmedP;

    // Validate all PINs are 6 digits
    if (newP.length !== 6 || !/^\d+$/.test(newP)) {
      this.changePinError = 'New PIN must be 6 digits.';
      this.changePinSuccess = '';
      this.submitting.update(() => false);
      return;
    }

    if (confirmedP.length !== 6 || !/^\d+$/.test(confirmedP)) {
      this.changePinError = 'Confirm PIN must be 6 digits.';
      this.changePinSuccess = '';
      this.submitting.update(() => false);
      return;
    }

    // Validate PIN confirmation
    if (!isValid) {
      this.changePinError = 'New PINs do not match.';
      this.changePinSuccess = '';
      this.submitting.update(() => false);
      return;
    }

    this.service
      .put<ResponseBody>(`user/forgot-password/${encodeURIComponent(this.email()).replace(/%20/g, "+")}/${encodeURIComponent(this.token()).replace(/%20/g, "+")}`, {
        newPin: newP,
        confirmedPin: confirmedP,
      })
      .subscribe({
        next: (res) => {
          this._snackBar.open(res.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this._snackBar.open(err.error.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
        },
      });
  }
}
