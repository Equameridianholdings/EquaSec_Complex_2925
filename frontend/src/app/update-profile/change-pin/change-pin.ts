import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../../interfaces/userDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';

@Component({
  selector: 'app-change-pin',
  imports: [FormsModule],
  templateUrl: './change-pin.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class ChangePin {
  service = inject(DataService);
  dialogRef = inject(MatDialogRef<ChangePin>);

  user: UserDTO = inject(MAT_DIALOG_DATA); //import for password verifications

  oldPassword: number[] = [0, 0, 0, 0, 0, 0];
  newPassword: number[] = [0, 0, 0, 0, 0, 0];
  confirmPassword: number[] = [0, 0, 0, 0, 0, 0];
  changePinError: string = '';
  changePinSuccess: string = '';

  closeModal() {
    this.dialogRef.close();
  }

  saveChanges() {
    const oldP = this.oldPassword.join();
    const newP = this.newPassword.join();
    const confirmedP = this.confirmPassword.join();
    const isValid = newP === confirmedP;

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
    if (isValid) {
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
          console.log(res.message);
        },
        error: (err) => {
          console.log(err.message);
        },
      });
  }
}
