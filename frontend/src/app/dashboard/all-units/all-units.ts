import { Component, inject, OnInit, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { unitDTO } from '../../interfaces/unitDTO';
import { ResponseBody } from '../../interfaces/ResponseBody';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Loader } from "../../components/loader/loader";

@Component({
  selector: 'app-all-units',
  imports: [Loader],
  templateUrl: './all-units.html',
  styleUrl: '../dashboard.css',
})
export class AllUnits implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);
  unit = signal<unitDTO>({
    complex: undefined,
    number: 0,
    numberOfParkingBays: 0,
    users: [],
    house: false
  });

  ngOnInit(): void {
    this.submitting.update(() => true);
    this.service.get<ResponseBody>('unit/user/').subscribe({
      next: (res) => {
        this.unit.set(res.payload);
        this._snackBar.open(res.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
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
}
