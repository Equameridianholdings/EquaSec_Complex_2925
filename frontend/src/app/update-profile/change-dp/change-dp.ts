import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserDTO } from '../../interfaces/userDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-change-dp',
  imports: [FormsModule],
  templateUrl: './change-dp.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class ChangeDp {
  dialogRef = inject(MatDialogRef<ChangeDp>);
  user: UserDTO = inject(MAT_DIALOG_DATA);
  
  profilePhotoData: string = '';
  cameraError: string = '';
  hasCameraStream: boolean = true;

  closeModal() {
    this.dialogRef.close();
  }

  captureProfilePhoto() {

  }

  startProfileCamera() {

  }

  retakeProfilePhoto() {

  }
}
