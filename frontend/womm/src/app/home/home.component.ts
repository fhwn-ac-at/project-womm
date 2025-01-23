import { Component } from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButton} from '@angular/material/button';
import {NgForOf} from '@angular/common';
import { RouterModule } from '@angular/router';

interface VideoFile {
  file: File;
  url: string;
  name: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatToolbar,
    MatButton,
    NgForOf,
    RouterModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  videos: VideoFile[] = [];
  draggedIndex: number | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach(file => {
        const url = URL.createObjectURL(file);
        this.videos.push({ file, url, name: file.name });
      });
    }
  }

  // Drag event methods
  onDragStart(event: DragEvent, index: number): void {
    this.draggedIndex = index;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();  // Necessary to allow a drop
  }

  onDropInUpload(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach(file => {
        const url = URL.createObjectURL(file);
        this.videos.push({ file, url, name: file.name });
      });
    }
  }

  onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedIndex !== null && this.draggedIndex !== index) {
      const draggedVideo = this.videos[this.draggedIndex];
      this.videos.splice(this.draggedIndex, 1);
      this.videos.splice(index, 0, draggedVideo);
    }
    this.draggedIndex = null;
  }
}
