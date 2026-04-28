import { Component, inject, OnInit, signal } from '@angular/core';
import { visitorDTO } from '../../interfaces/visitorDTO';
import { VisitorCard } from '../../components/visitor-card/visitor-card';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../services/socket.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Loader } from "../../components/loader/loader";

@Component({
  selector: 'app-visitors',
  imports: [CommonModule, VisitorCard, Loader],
  templateUrl: './visitors.html',
  styleUrl: '../dashboard.css',
  standalone: true,
})
export class Visitors implements OnInit {
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  socket = inject(SocketService);
  service = inject(DataService);
  visitors = signal<visitorDTO[]>([]);

  getVisitors() {
    this.submitting.update(() => true);
    if (this.visitors().length > 0) this.visitors.update(() => []); // Handles for constant updates

    this.service.get<ResponseBody>('visitor/user').subscribe({
      next: (res) => {
        const allVisitors = (res.payload as visitorDTO[]) ?? [];
        const validVisitors = allVisitors.filter((visitor) => visitor?.validity === true);
        this.visitors.set(validVisitors);
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
  ngOnInit(): void {
    this.getVisitors();

    this.socket.getVisitors(() => {
      this.getVisitors();
    });
  }
}
