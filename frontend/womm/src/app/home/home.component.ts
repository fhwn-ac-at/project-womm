import { Component } from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatButton} from '@angular/material/button';
import {NgForOf} from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../environment/environment';
import { ApiService } from '../apiService';

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
    RouterModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  videos: VideoFile[] = [];
  draggedIndex: number | null = null;

  constructor(private apiService: ApiService) {}

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

  uploadAndRenderVideo(): void {
    if (this.videos.length == 0) {
      console.log("No videos");
      // Maybe add pop-up
    } else {
      console.log(environment.apiURL);
  
      // Create Workspace, get ID
      this.apiService.postData('workspaces', {}).subscribe({
        next: (response) => {
          console.log('Workspace created: ', response);
  
          const workspaceID = response.id;
          // Initiate file upload by setting file size
          let size = 0;
          this.videos.forEach(video => {
            size += video.file.size;
          });
          console.log("size: " + size);
  
          const workspaceString = "workspaces/" + workspaceID + "/files";

          this.apiService.putData(workspaceString, { "fileSize": size, "name": 'video' }).subscribe({
            next: (response) => {
              console.log(response);
          
              const uploadID = response.uploadId;
              const maxPartSize = response.maxPartSize;

              // Upload video parts
              this.videos.forEach(video => {
                const file = video.file;
                const totalParts = Math.ceil(file.size / maxPartSize);
          
                const uploadPart = (partIndex: number) => {
                  if (partIndex >= totalParts) {
                    console.log("All parts uploaded for: ", file.name);
                    return;
                  }
          
                  const start = partIndex * maxPartSize;
                  const end = Math.min(start + maxPartSize, file.size);
          
                  const fileSlice = file.slice(start, end);
          
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (reader.readyState === FileReader.DONE) {
                      const arrayBuffer = reader.result as ArrayBuffer;
                      const byteArray = new Uint8Array(arrayBuffer);
                      console.log(byteArray);
                      
                      const uploadString = 'uploads/' + uploadID + '/part';
                      console.log(uploadString);
                      // Send the byte data as part of the request body
                      const formData = new FormData();
                      formData.append('partNumber', (partIndex + 1).toString());
                      formData.append('part', new Blob([byteArray]));

                      this.apiService.postMultiFormData(uploadString, formData).subscribe({
                        next: () => {
                          console.log(`Uploaded part ${partIndex} of ${totalParts} for file:`, file.name);
                          uploadPart(partIndex + 1); // Upload the next part
                        },
                        error: (error) => {
                          console.error(`Error uploading part ${partIndex + 1} for file:`, file.name, error);
                        }
                      });
                    }
                  };
          
                  // Read the file slice as an ArrayBuffer
                  reader.readAsArrayBuffer(fileSlice);
                };
          
                // Start uploading from the first part
                uploadPart(0);
              });
            },
            error: (error) => {
              console.error('Error registering file size in workspace:', error);
            }
          });
        },
        error: (error) => {
          console.error('Error creating workspace:', error);
        }
      });
    }
  } 
}
