import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { visitorDTO } from '../../../interfaces/visitorDTO';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfirmVisitor } from '../confirm-visitor/confirm-visitor';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-book-visitor',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './book-visitor.html',
  styleUrl: '../../dashboard.css',
})
export class BookVisitor {
  service = inject(DataService);
  readonly dialogRef = inject(MatDialogRef<BookVisitor>);
  dialog = inject(MatDialog);

  visitorIdNumber: string = '' //Encryption still in dev
  newVisitor: visitorDTO = {
    access: false,
    contact: '',
    driving: false,
    name: '',
    surname: '',
    validity: false,
    vehicle: {
      make: '',
      model: '',
      registrationNumber: '',
      colour: ''
    },
  };

  closeModal() {
    this.dialogRef.close();
  }

  openConfirmationModal() {
    this.dialog.open(ConfirmVisitor, {
      data: this.newVisitor,
    });
    this.dialogRef.close();
  }
}
