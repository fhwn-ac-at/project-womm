import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { NgForOf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../environment/environment';

interface Scene {
  video: {
    name: string;
    downloadUrl?: string;
  };
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
  styleUrls: ['./video-list.component.css'],
})
export class VideoListComponent implements OnInit, OnDestroy {
  availableVideos: { name: string; url: string }[] = [];
  pollingSubscription: Subscription | null = null;
  private apiUrl = `${environment.apiURL}/scenes`; // Aktualisierter API-Endpunkt mit Environment-Variable

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.fetchVideos(); // Sofortige API-Abfrage
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private fetchVideos(): void {
    this.http.get<Scene[]>(this.apiUrl).subscribe((data) => {
      this.availableVideos = data
        .filter(scene => scene.video?.downloadUrl) // Nur Videos mit gültiger URL
        .map(scene => ({
          name: scene.video.name,
          url: scene.video.downloadUrl!
        }));
    }, (error) => {
      this.showErrorMessage('Failed to fetch videos. Please try again later.');
    });
  }

  private startPolling(): void {
    this.pollingSubscription = interval(5000)
      .pipe(switchMap(() => this.http.get<Scene[]>(this.apiUrl)))
      .subscribe((data) => {
        this.availableVideos = data
          .filter(scene => scene.video?.downloadUrl) // Nur Videos mit gültiger URL
          .map(scene => ({
            name: scene.video.name,
            url: scene.video.downloadUrl!
          }));
      }, (error) => {
        this.showErrorMessage('Failed to fetch videos. Please try again later.');
      });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  downloadVideo(video: { name: string; url: string }): void {
    fetch(video.url)
      .then((response) => {
        if (!response.ok) {
          this.showErrorMessage(`The video \"${video.name}\" could not be downloaded. (Status: ${response.status})`);
          return null;
        }
        return response.blob();
      })
      .then((blob) => {
        if (!blob) return;
        const anchor = document.createElement('a');
        const url = URL.createObjectURL(blob);
        anchor.href = url;
        anchor.download = video.name;
        anchor.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        this.showErrorMessage(`The video \"${video.name}\" could not be downloaded. Please check your connection.`);
      });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
