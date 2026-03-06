import { Component, inject, OnInit, signal } from '@angular/core';
import { vehicleDTO } from '../../interfaces/vehicleDTO';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { Loader } from '../../components/loader/loader';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

@Component({
  selector: 'app-vehicles',
  imports: [Loader],
  templateUrl: './vehicles.html',
  styleUrl: '../dashboard.css',
  standalone: true,
})
export class Vehicles implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  service = inject(DataService);
  unitVehicles = signal<vehicleDTO[]>([]);

  getVehicles() {
    this.submitting.update(() => true);
    this.service.get<ResponseBody>('vehicle/user/').subscribe({
      next: (res) => {
        this.submitting.update(() => false);

        const Vehicles = res.payload as vehicleDTO[];

        Vehicles.map((val: vehicleDTO) => {
          this.unitVehicles.update((arr) => [...arr, val]);
        });
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

  ngOnInit(): void {
    this.getVehicles();
  }
}
