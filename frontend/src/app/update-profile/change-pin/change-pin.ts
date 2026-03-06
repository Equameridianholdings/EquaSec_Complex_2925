import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../../interfaces/userDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { Loader } from "../../components/loader/loader";
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-change-pin',
  imports: [FormsModule, Loader],
  templateUrl: './change-pin.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class ChangePin implements AfterViewInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);
  dialogRef = inject(MatDialogRef<ChangePin>);

  user?: UserDTO = inject(MAT_DIALOG_DATA); //import for password verifications

  ngAfterViewInit(): void {
    this.submitting.update(() => true);
    if (!this.user) {
      this.service.get<ResponseBody>('user/current').subscribe({
        next: (res) => {
          this.submitting.update(() => false);
          this.user = res.payload as UserDTO;
        },
        error: (err) => {
          this._snackBar.open(err.error.message, "close", {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition
          });
        },
      });
    }
  }

  oldPassword: number[] = [0, 0, 0, 0, 0, 0];
  newPassword: number[] = [0, 0, 0, 0, 0, 0];
  confirmPassword: number[] = [0, 0, 0, 0, 0, 0];
  changePinError: string = '';
  changePinSuccess: string = '';

  closeModal() {
    this.dialogRef.close();
  }

  saveChanges() {
    this.submitting.update(() => true);
    const oldP = this.oldPassword.join().replaceAll(",", "");
    const newP = this.newPassword.join().replaceAll(",", "");
    const confirmedP = this.confirmPassword.join().replaceAll(",", "");
    const isValid = newP == confirmedP;

    // Validate all PINs are 6 digits
    if (oldP.length !== 6 || !/^\d+$/.test(oldP)) {
      this.changePinError = 'Current PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    if (newP.length !== 6 || !/^\d+$/.test(newP)) {
      this.changePinError = 'New PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    if (confirmedP.length !== 6 || !/^\d+$/.test(confirmedP)) {
      this.changePinError = 'Confirm PIN must be 6 digits.';
      this.changePinSuccess = '';
      return;
    }

    // Validate PIN confirmation
    if (!isValid) {
      this.changePinError = 'New PINs do not match.';
      this.changePinSuccess = '';
      return;
    }

    // Check if current PIN matches new PIN
    if (oldP === newP) {
      this.changePinError = 'New PIN cannot be the same as current PIN.';
      this.changePinSuccess = '';
      return;
    }

    // Success
    this.changePinError = '';
    this.changePinSuccess = 'PIN changed successfully!';

    this.service
      .put<ResponseBody>('user/changePin', {
        currentPin: oldP,
        newPin: newP,
        confirmedPin: confirmedP,
      })
      .subscribe({
        next: (res) => {
          this._snackBar.open(res.message, "close", {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition
          });
          this.submitting.update(() => false);
          this.dialogRef.close();
        },
        error: (err) => {
          this._snackBar.open(err.error.message, "close", {
            horizontalPosition: this.horizontalPosition,
            verticalPosition: this.verticalPosition
          });
          this.submitting.update(() => false);
        },
      });
  }
}
