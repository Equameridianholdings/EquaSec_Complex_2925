import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { shareCode, visitorDTO } from '../../../interfaces/visitorDTO';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-visitor',
  imports: [FormsModule],
  templateUrl: './confirm-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class ConfirmVisitor {
  readonly dialogRef = inject(MatDialogRef<ConfirmVisitor>);
  visitor: visitorDTO = inject(MAT_DIALOG_DATA);
  
  @Input() visitorIdNumber!: string;
  
  closeModal() {
    this.dialogRef.close();
  }

  shareVisitorCode() {
    shareCode(this.visitor);
  }

  confirmBooking() {
    // Make POST request to visitor/ endpoint before confirmation
    this.dialogRef.close();
  }

}
