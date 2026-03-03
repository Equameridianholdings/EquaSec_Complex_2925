import { Component, inject, OnInit, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { unitDTO } from '../../interfaces/unitDTO';
import { ResponseBody } from '../../interfaces/ResponseBody';

@Component({
  selector: 'app-all-units',
  imports: [],
  templateUrl: './all-units.html',
  styleUrl: '../dashboard.css',
})
export class AllUnits implements OnInit {
  service = inject(DataService);
  unit = signal<unitDTO>({
    complex: undefined,
    number: 0,
    numberOfParkingBays: 0,
    users: []
  });

  ngOnInit(): void {
    this.service.get<ResponseBody>('unit/user/').subscribe({
      next: (res) => {
        console.log('Success! ', res.message);
        this.unit.set(res.payload);
      },
      error: (err) => {
        console.error('Error! ', err.message);
      },
    });
  }
}
