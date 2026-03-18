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

@Component({
  selector: 'app-paygate',
  imports: [Loader],
  templateUrl: './paygate.html',
  styleUrl: './paygate.css',
})
export class Paygate implements OnInit {
  currentUser = signal<UserDTO>({
    cellNumber: '',
    confirmPassword: '',
    emailAddress: '',
    movedOut: false,
    name: '',
    password: '',
    profilePhoto: '',
    surname: '',
    type: [],
  });
  dataService = inject(DataService);
  submitting = signal(false);
  private _snackBar = inject(MatSnackBar);
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  ngOnInit(): void {
    this.submitting.update(() => true);
    this.dataService.get<ResponseBody>('user/current').subscribe({
      next: (res) => {
        this.currentUser.update(() => res.payload as UserDTO);
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
  TYPE = process.env['NG_APP_SUBSCRIPTION_TYPE'];

  processSinglePayment(item: string, amount: number = 0) {
    const myData: any = {};
    // Merchant details
    myData['merchant_id'] = this.MERCHANT_ID;
    myData['merchant_key'] = this.MERCHANT_Key;
    myData['return_url'] = this.RETURN_URI;
    myData['cancel_url'] = this.CANCEL_URI;
    myData['notify_url'] = this.NOTIFY_URI;
    // Buyer details
    myData['name_first'] = this.currentUser().name;
    myData['name_last'] = this.currentUser().surname;
    myData['email_address'] = this.currentUser().emailAddress;
    // Transaction details
    myData['m_payment_id'] = crypto.randomUUID().toString();
    myData['amount'] = amount.toString();
    myData['item_name'] = item;
    
    this.dataService.post<ResponseBody>(`payment/${this.PASSPHRASE}`, myData).subscribe({
      next: (res) => {
        window.open(`${this.PAYFAST_URI}/?${res.payload}`, "_blank")
      },
    });
  }
}
