import { Component, inject, OnInit } from '@angular/core';
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
  unit!: unitDTO;

  ngOnInit(): void {
    this.service.get<ResponseBody>('unit/user').subscribe({
      next: (res) => {
        console.log('Success! ', res.message);
        this.unit = res.payload as unitDTO;
      },
      error: (err) => {
        console.error('Error! ', err.message);
      },
    });
  }
}
