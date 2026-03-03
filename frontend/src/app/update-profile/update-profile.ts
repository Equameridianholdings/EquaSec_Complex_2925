import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../interfaces/userDTO';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../services/data.service';
import { ResponseBody } from '../interfaces/ResponseBody';
import { ChangePin } from './change-pin/change-pin';
import { ChangeDp } from './change-dp/change-dp';

@Component({
  selector: 'app-update-profile',
  imports: [FormsModule],
  templateUrl: './update-profile.html',
  styleUrl: '../dashboard/dashboard.css',
})
export class UpdateProfile implements OnInit {
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
    type: []
  });
  updatedUser: any = {};

  ngOnInit(): void {
    this.service.get<ResponseBody>('user/current').subscribe({
      next: (res) => {
        console.log(res.message);
        this.user.set(res.payload as UserDTO);
      },
      error: (err) => {
        console.error(err.message);
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
    // TODO: Validations on data
    
    this.service.put<ResponseBody>('user/update', this.updatedUser).subscribe({
      next: (res) => {
        console.log(res.message);
        this.closeModal();
      },
      error: (err) => {
        console.error(err.message);
      },
    });
  }
}
