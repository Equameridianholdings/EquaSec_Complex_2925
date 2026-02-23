import { Component, inject, OnInit } from '@angular/core';
import { visitorDTO } from '../../interfaces/visitorDTO';
import { VisitorCard } from '../../components/visitor-card/visitor-card';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';

@Component({
  selector: 'app-visitors',
  imports: [VisitorCard],
  templateUrl: './visitors.html',
  styleUrl: '../dashboard.css',
  standalone: true,
})
export class Visitors implements OnInit {
  service = inject(DataService);
  visitors: visitorDTO[] = [];

  ngOnInit(): void {
    this.service.get<ResponseBody>('visitor/user').subscribe({
      next: (res) => {
        console.log(res.message);
        this.visitors = res.payload;
      },
      error: (err) => {
        console.error(err.message);
      },
    });
  }
}