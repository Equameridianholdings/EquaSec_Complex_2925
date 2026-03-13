import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../interfaces/userDTO';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../services/data.service';
import { ResponseBody } from '../interfaces/ResponseBody';
import { ChangePin } from './change-pin/change-pin';
import { ChangeDp } from './change-dp/change-dp';
import { Loader } from '../components/loader/loader';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-update-profile',
  imports: [FormsModule, Loader],
  templateUrl: './update-profile.html',
  styleUrl: '../dashboard/dashboard.css',
})
export class UpdateProfile implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);
  dialogRef = inject(MatDialogRef<UpdateProfile>);
  dialog = inject(MatDialog);
  user = signal<UserDTO>({
    cellNumber: '',
    confirmPassword: '',
    emailAddress: '',
    movedOut: false,
    name: '',
    password: '',
    profilePhoto: '',
    surname: '',
    type: [],
  });
  updatedUser: any = {};

  ngOnInit(): void {
    this.submitting.update(() => true);
    this.service.get<ResponseBody>('user/current').subscribe({
      next: (res) => {
        this.user.set(res.payload as UserDTO);
        this.submitting.update(() => false);
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

  openChangePinModal() {
    this.dialog.open(ChangePin, {
      data: this.user(),
    });
  }

  openChangeDPModal() {
    this.dialog
      .open(ChangeDp, {
        data: this.user(),
      })
      .afterClosed()
      .subscribe((photoData: string | null | undefined) => {
        if (!photoData) {
          return;
        }
        const current = this.user();
        this.user.set({
          ...current,
          profilePhoto: photoData,
        });
        this.updatedUser = {
          ...this.updatedUser,
          profilePhoto: photoData,
        };
      });
  }

  closeModal() {
    this.dialogRef.close();
  }

  onChange(event: any) {
    // Track the fields that are being updated
    const inputElement = event.target as HTMLInputElement;
    const propertyName = inputElement.name;
    const value = inputElement.value;

    this.updatedUser = { ...this.updatedUser, [propertyName]: value };
  }

  saveChanges() {
    this.submitting.update(() => true);
    // TODO: Validations on data

    this.service.put<ResponseBody>('user/update', this.updatedUser).subscribe({
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
