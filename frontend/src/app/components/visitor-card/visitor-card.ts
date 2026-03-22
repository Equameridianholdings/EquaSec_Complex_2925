import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { getHours, shareCode, visitorDTO } from '../../interfaces/visitorDTO';
import { ResponseBody } from '../../interfaces/ResponseBody';
import { DataService } from '../../services/data.service';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';

@Component({
  selector: 'app-visitor-card',
  imports: [],
  templateUrl: './visitor-card.html',
  styleUrl: '../../dashboard/dashboard.css',
})
export class VisitorCard implements OnInit {
  @Input() gaurd!: boolean;
  @Input() visitor!: visitorDTO;
  hours!: number;
  submitting = signal(false);
  showConfirmModal = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  dataService = inject(DataService)
  granted = signal(false)

  ngOnInit(): void {
    this.hours = getHours(this.visitor);
  }

  shareVisitorCode() {
    shareCode(this.visitor);
  }


  private showToast(message: string): void {
    this._snackBar.open(message, 'close', {
      horizontalPosition: this.horizontalPosition,
      verticalPosition: this.verticalPosition,
    });
  }

  protected onGrantAccess(code: visitorDTO): void {
    if (!code) return;
    this.showConfirmModal.set(true);
  }

  protected cancelGrant(): void {
    this.showConfirmModal.set(false);
  }

  protected confirmGrant(): void {
    this.showConfirmModal.set(false);
    const code = this.visitor;
    if (!code) {
      this.showToast('Access granted');
      return;
    }

    const targetVisitorId = String(code._id ?? '').trim();

    code.validity = false;
    code.access = true;

    if (targetVisitorId) {
      this.dataService
        .put<ResponseBody>(`visitor/grant`, {
          _id: targetVisitorId,
          validity: false,
          access: true,
          expiry: code.expiry ?? null,
        })
        .subscribe({
          next: (res) => {
            this.showToast(res.message);
            this.granted.update(() => true);
            setTimeout(() => {
              window.location.reload();
            }, 1200);
          },
          error: () => {
            this.showToast('Access not granted');
          },
        });
    }
  }
}
