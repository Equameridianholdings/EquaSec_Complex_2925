import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { DataService } from '../../services/data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { Loader } from "../loader/loader";

@Component({
  selector: 'app-forgot-password-modal',
  imports: [FormsModule, Loader],
  templateUrl: './forgot-password-modal.html',
  styleUrl: '../../login/login.css',
})
export class ForgotPasswordModal {
  email: string = '';
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  dataService = inject(DataService);
  dialogRef = inject(MatDialogRef<ForgotPasswordModal>);

  protected markTouched(event: Event): void {
    const input = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!input) {
      return;
    }
    input.classList.add('touched');
  }

  protected isFormValid(): boolean {
    return this.email.trim().length > 0;
  }

  closeModal() {
    this.dialogRef.close();
  }

  submitForm() {
    this.submitting.update(() => true);
    this.dataService
      .post<ResponseBody>('user/forgot-password', { emailAddress: this.email })
      .subscribe({
        next: (res) => {
          this._snackBar.open(res.message, 'close', {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition,
          });
          this.submitting.update(() => false);
          this.closeModal();
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
