import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { visitorDTO } from '../../../interfaces/visitorDTO';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfirmVisitor } from '../confirm-visitor/confirm-visitor';
import { DataService } from '../../../services/data.service';
import { vehicleDTO } from '../../../interfaces/vehicleDTO';

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
  newVehicle: vehicleDTO = {
    colour: '',
    make: '',
    model: '',
    registrationNumber: ''
  }; 
  newVisitor: visitorDTO = {
    access: true,
    contact: '',
    driving: false,
    name: '',
    surname: '',
    validity: true,
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
    if (!this.newVisitor.driving) 
      this.newVisitor.vehicle = undefined;
    else
      this.newVisitor.vehicle = this.newVehicle;
    this.dialog.open(ConfirmVisitor, {
      data: this.newVisitor,
    });
    this.dialogRef.close();
  }
}
