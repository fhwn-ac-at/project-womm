import { Component } from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButton} from '@angular/material/button';
import {Router} from '@angular/router';
import {S3} from 'aws-sdk';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatToolbar,
    MatButton
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  videoFile: File | null = null;

  constructor(private router: Router) {}

  openFileExplorer() {
    const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle file selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.videoFile = input.files![0];
      this.uploadVideoClip(this.videoFile);
    }
  }

  uploadVideoClip(file: File) {
    // upload clips to s3 here
    console.log("uploading");
  }
}
