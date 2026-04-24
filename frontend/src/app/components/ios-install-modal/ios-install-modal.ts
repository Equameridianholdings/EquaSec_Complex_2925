import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'ios-install-modal',
  templateUrl: './ios-install-modal.html',
  styleUrls: ['./ios-install-modal.css']
})
export class IosInstallModal {
  constructor(
    public dialogRef: MatDialogRef<IosInstallModal>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
