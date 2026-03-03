import { Component, inject, OnInit, signal } from '@angular/core';
import { vehicleDTO } from '../../interfaces/vehicleDTO';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';

@Component({
  selector: 'app-vehicles',
  imports: [],
  templateUrl: './vehicles.html',
  styleUrl: '../dashboard.css',
  standalone: true,
})
export class Vehicles implements OnInit {
  service = inject(DataService);
  unitVehicles = signal<vehicleDTO[]>([]);

  getVehicles() {
    this.service.get<ResponseBody>('vehicle/user/').subscribe({
      next: (res) => {
        console.log(res.message);

        const Vehicles = res.payload as vehicleDTO[];

        Vehicles.map((val: vehicleDTO) => {
          this.unitVehicles.update((arr) => [...arr, val]);
        });
      },
      error: (err) => {
        console.error(err.message);
      },
    });
  }

  ngOnInit(): void {
    this.getVehicles();
  }
}
