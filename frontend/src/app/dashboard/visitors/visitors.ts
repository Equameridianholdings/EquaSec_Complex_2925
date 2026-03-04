import { Component, inject, OnInit, signal } from '@angular/core';
import { visitorDTO } from '../../interfaces/visitorDTO';
import { VisitorCard } from '../../components/visitor-card/visitor-card';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../services/socket.service';

@Component({
  selector: 'app-visitors',
  imports: [CommonModule, VisitorCard],
  templateUrl: './visitors.html',
  styleUrl: '../dashboard.css',
  standalone: true,
})
export class Visitors implements OnInit {
  socket = inject(SocketService);
  service = inject(DataService);
  visitors = signal<visitorDTO[]>([]);

  getVisitors() {
    if (this.visitors().length > 0) this.visitors.update(() => []); // Handles for constant updates

    this.service.get<ResponseBody>('visitor/user').subscribe({
      next: (res) => {
        console.log(res.message);
        const allVisitors = (res.payload as visitorDTO[]) ?? [];
        const validVisitors = allVisitors.filter((visitor) => visitor?.validity === true);
        this.visitors.set(validVisitors);
      },
      error: (err) => {
        console.error(err.message);
      },
    });
  }

  ngOnInit(): void {
    this.getVisitors();

    this.socket.getVisitors(() => {
      this.getVisitors();
    });
  }
}
