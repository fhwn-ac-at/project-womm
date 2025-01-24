import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { NgForOf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Video {
  name: string;
  url: string;
}

@Component({
  selector: 'app-video-list',
  standalone: true,
  imports: [
    MatToolbar,
    MatButton,
    RouterModule,
    NgForOf,
    MatSnackBarModule
  ],
  templateUrl: './video-list.component.html',
  styleUrl: './video-list.component.css',
})
export class VideoListComponent implements OnInit, OnDestroy {
  availableVideos: Video[] = [];
  pollingSubscription: Subscription | null = null;
  private apiUrl = 'https://your-api-endpoint.com/videos'; // API-Endpunkt

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.availableVideos = [
      { name: 'Sample Video 1', url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' },
      { name: 'Sample Video 2', url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_2mb.mp4' },
      { name: 'Sample Video 3', url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_5mb.mp4' },
    ];
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    this.pollingSubscription = interval(5000)
      .pipe(switchMap(() => this.http.get<Video[]>(this.apiUrl)))
      .subscribe((data) => {
        this.availableVideos = data; // Aktualisiert die Video-Liste
      });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  downloadVideo(video: Video): void {
    fetch(video.url)
      .then((response) => {
        if (!response.ok) {
          // Direkt zur Snackbar
          this.showErrorMessage(`The video "${video.name}" could not be downloaded. (Status: ${response.status})`);
          return null; // Beendet die Verarbeitung hier
        }
        return response.blob();
      })
      .then((blob) => {
        if (!blob) return; // Falls ein Fehler aufgetreten ist, mache nichts
        const anchor = document.createElement('a');
        const url = URL.createObjectURL(blob);
        anchor.href = url;
        anchor.download = video.name;
        anchor.click();
        URL.revokeObjectURL(url); // Speicher freigeben
      })
      .catch(() => {
        this.showErrorMessage(`The video "${video.name}" could not be downloaded. Please check your connection.`);
      });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000, // Die Nachricht bleibt 5 Sekunden sichtbar
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
  
}
