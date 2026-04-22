import { Component, inject, OnInit, signal } from '@angular/core';
import { UserDTO } from '../../interfaces/userDTO';
import { DataService } from '../../services/data.service';
import { ResponseBody } from '../../interfaces/ResponseBody';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { Loader } from '../loader/loader';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { invoiceDTO } from '../../interfaces/invoiceDTO';
import { CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-paygate',
  imports: [Loader, DatePipe, CurrencyPipe],
  templateUrl: './paygate.html',
  styleUrl: './paygate.css',
})
export class Paygate implements OnInit {
  ngOnInit(): void {
    this.dataService.get<ResponseBody>('invoice/subscribed').subscribe({
      next: (res) => this.invoice.update(() => res.payload as invoiceDTO),
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
        this.dialogRef.close();
      },
    });
  }
  invoice = signal<invoiceDTO>({
    amount: 0,
    dueDate: new Date(),
    invoiceStatus: '',
    issueDate: new Date(),
    unit: undefined,
    isSubscribed: false,
  });
  payGateData = inject(MAT_DIALOG_DATA);
  dataService = inject(DataService);
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';
  dialogRef = inject(MatDialogRef<Paygate>);

  isPROD: number = process.env['NG_APP_PRODUCTION'] as number;
  MERCHANT_ID = process.env['NG_APP_MERCHANT_ID'];
  MERCHANT_Key = process.env['NG_APP_MERCHANT_KEY'];
  PAYFAST_URI =
    this.isPROD === 1
      ? process.env['NG_APP_PAYFAST_URI']
      : process.env['NG_APP_PAYFAST_SANDBOX_URI'];
  RETURN_URI = process.env['NG_APP_RETURN_URI'];
  CANCEL_URI = process.env['NG_APP_CANCEL_URI'];
  NOTIFY_URI = process.env['NG_APP_NOTIFY_URI'];
  PASSPHRASE = process.env['NG_APP_PASSPHRASE'];
  FREQUENCY = process.env['NG_APP_BILLING_FREQUENCY'];
  CYCLE = process.env['NG_APP_BILLING_CYCLE'];
  SUBSCRIPTION_TYPE = process.env['NG_APP_SUBSCRIPTION_TYPE'];
  TYPE = process.env['NG_APP_TYPE'];

  processSinglePayment(item: string, amount: number = 0) {
    const myData: any = {};
    // Merchant details
    myData['merchant_id'] = this.MERCHANT_ID;
    myData['merchant_key'] = this.MERCHANT_Key;
    myData['return_url'] = this.RETURN_URI;
    myData['cancel_url'] = this.CANCEL_URI;
    myData['notify_url'] = this.NOTIFY_URI;
    // Buyer details
    myData['name_first'] = this.payGateData.currentUser.name;
    myData['name_last'] = this.payGateData.currentUser.surname;
    myData['email_address'] = this.payGateData.currentUser.emailAddress;
    // Transaction details
    myData['m_payment_id'] = crypto.randomUUID().toString();
    myData['amount'] = amount.toString();
    myData['item_name'] = item;

    this.dataService.post<ResponseBody>(`payment/${this.PASSPHRASE}`, myData).subscribe({
      next: (res) => {
        window.open(`${this.PAYFAST_URI}/?${res.payload}`, '_blank');
      },
    });
  }

  processSubscriptionPayment(item: string, amount: number = 0) {
    const myData: any = {};
    // Merchant details
    myData['merchant_id'] = this.MERCHANT_ID;
    myData['merchant_key'] = this.MERCHANT_Key;
    myData['return_url'] = this.RETURN_URI;
    myData['cancel_url'] = this.CANCEL_URI;
    myData['notify_url'] = this.NOTIFY_URI;
    myData['name_first'] = this.payGateData.currentUser.name;
    myData['name_last'] = this.payGateData.currentUser.surname;
    myData['email_address'] = this.payGateData.currentUser.emailAddress;
    myData['m_payment_id'] = crypto.randomUUID().toString();
    myData['amount'] = amount.toString();
    myData['item_name'] = item;
    myData['subscription_type'] = this.SUBSCRIPTION_TYPE as string;
    myData['recurring_amount'] = amount.toString();
    myData['frequency'] = this.FREQUENCY as string;
    myData['cycles'] = this.CYCLE as string;

    this.dataService.post<ResponseBody>(`payment/subscribe/${this.PASSPHRASE}`, myData).subscribe({
      next: (res) => {
        window.open(`${this.PAYFAST_URI}/?${res.payload}`, '_blank');
      },
    });
  }

  updateCard() {
    this.dataService.get<ResponseBody>('payment/card').subscribe({
      next: (res) => {
        window.open(
          `https://www.payfast.co.za/eng/recurring/update/${res.payload}?return=${this.RETURN_URI}`,
          '_blank',
        );
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }

  cancelSubscription() {
    this.dataService.get<ResponseBody>('payment/cancel').subscribe({
      next: (res) => {
        this._snackBar.open(res.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
      error: (err) => {
        this._snackBar.open(err.error.message, 'close', {
          horizontalPosition: this.horizontalPosition,
          verticalPosition: this.verticalPosition,
        });
      },
    });
  }
}
