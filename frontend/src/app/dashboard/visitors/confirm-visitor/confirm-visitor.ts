import { Component, inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { visitorDTO } from '../../../interfaces/visitorDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../../services/data.service';
import { ResponseBody } from '../../../interfaces/ResponseBody';
import { SocketService } from '../../../services/socket.service';
import { Loader } from '../../../components/loader/loader';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-confirm-visitor',
  imports: [FormsModule, Loader],
  templateUrl: './confirm-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class ConfirmVisitor {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  socket = inject(SocketService);
  service = inject(DataService);
  readonly dialogRef = inject(MatDialogRef<ConfirmVisitor>);
  visitor: any = inject(MAT_DIALOG_DATA);

  visitorIdNumber!: string;

  closeModal() {
    this.dialogRef.close();
  }

  confirmBooking() {
    this.submitting.update(() => true);
    console.log(this.visitor)
    // Make POST request to visitor/ endpoint before confirmation
    this.service.post<ResponseBody>(this.visitor.endpoint, this.visitor.data).subscribe({
      next: (res) => {
        this.dialogRef.close();
        this.socket.newVisitor();
        this._snackBar.open(res.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.submitting.update(() => false);
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
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
