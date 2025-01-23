import { Component } from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButton} from '@angular/material/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [
    RouterModule,
    MatToolbar,
    MatButton
  ],
  templateUrl: './video-list.component.html',
  styleUrl: './video-list.component.css'
})
export class VideoListComponent {

}
