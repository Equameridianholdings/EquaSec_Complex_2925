import { Component } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner'
 
@Component({
  selector: 'app-loader',
  imports: [MatProgressSpinner],
  templateUrl: './loader.html',
  styleUrl: './loader.css',
  standalone: true,
})
export class Loader {

}
