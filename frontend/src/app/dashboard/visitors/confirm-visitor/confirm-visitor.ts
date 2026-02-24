import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { shareCode, visitorDTO } from '../../../interfaces/visitorDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DataService } from '../../../services/data.service';
import { ResponseBody } from '../../../interfaces/ResponseBody';

@Component({
  selector: 'app-confirm-visitor',
  imports: [FormsModule],
  templateUrl: './confirm-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class ConfirmVisitor {
  service = inject(DataService);
  readonly dialogRef = inject(MatDialogRef<ConfirmVisitor>);
  visitor: visitorDTO = inject(MAT_DIALOG_DATA);

  visitorIdNumber!: string;

  closeModal() {
    this.dialogRef.close();
  }

  shareVisitorCode() {
    shareCode(this.visitor);
  }

  confirmBooking() {
    // Make POST request to visitor/ endpoint before confirmation
    this.service.post<ResponseBody>('visitor/', this.visitor).subscribe({
      next: (res) => {
        console.log(res.message);
        this.dialogRef.close();
      },
      error: (err) => {
        console.error(err);
      },
    });
  }
}
