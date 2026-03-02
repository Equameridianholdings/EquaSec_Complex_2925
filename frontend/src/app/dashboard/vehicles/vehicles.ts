import { Component, inject, OnInit } from '@angular/core';
import { vehicleDTO } from '../../interfaces/vehicleDTO';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';

@Component({
  selector: 'app-vehicles',
  imports: [],
  templateUrl: './vehicles.html',
  styleUrl: '../dashboard.css',
})
export class Vehicles implements OnInit {
  service = inject(DataService);
  unitVehicles: vehicleDTO[] = [];

  ngOnInit(): void {
    this.service.get<ResponseBody>('vehicle/user/').subscribe({
      next: (res) => {
        console.log(res.message);
        this.unitVehicles = res.payload as vehicleDTO[];
      },
      error: (err) => {
        console.error(err.message);
      },
    });
  }
}
