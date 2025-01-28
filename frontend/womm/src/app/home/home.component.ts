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
      // TODO: Maybe add pop-up
    } else {
      console.log(environment.apiURL);
  
      // Create Workspace, get ID
      this.apiService.postData('workspaces', {}).subscribe({
        next: (response) => {
          console.log('Workspace created: ', response);
      
          const workspaceID = response.id;
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
              let globalPartNumber = 1;
      
              // Create an array of Promises for each upload
              const uploadPromises: Promise<void>[] = [];
      
              // Process uploads in chunks
              this.videos.forEach(video => {
                const file = video.file;
                const totalParts = Math.ceil(file.size / maxPartSize);
      
                const uploadPart = (partIndex: number): Promise<void> => {
                  return new Promise((resolve, reject) => {
                    if (partIndex >= totalParts) {
                      console.log("All parts uploaded for: ", file.name);
                      resolve();
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
      
                        const uploadString = 'uploads/' + uploadID + '/part';
                        const formData = new FormData();
                        formData.append('partNumber', globalPartNumber.toString());
                        formData.append('part', new Blob([byteArray]));
      
                        this.apiService.postMultiFormData(uploadString, formData).subscribe({
                          next: () => {
                            console.log(`Uploaded global part ${globalPartNumber} for file:`, file.name);
                            globalPartNumber++; // Increment the global part counter
                            uploadPart(partIndex + 1).then(resolve).catch(reject); // Continue with the next part
                          },
                          error: (error) => {
                            console.error(`Error uploading part ${globalPartNumber} for file:`, file.name, error);
                            reject(error);
                          }
                        });
                      }
                    };
      
                    // Read the file slice as an ArrayBuffer
                    reader.readAsArrayBuffer(fileSlice);
                  });
                };
      
                // Add the upload operation for this video to the promises array
                uploadPromises.push(uploadPart(0));
              });
      
              // Wait for all uploads to complete
              Promise.all(uploadPromises)
                .then(() => {
                  console.log("All uploads completed successfully. Proceeding to the next step.");
      
                  console.log(this.videos);
                  this.getTotalVideoDuration()
                  .then(totalDuration => {
                    console.log(`Total video duration: ${totalDuration.toFixed(2)} seconds`);

                    // Create scene here:
                    const scene = {
                      scene: {
                        version: 1,
                        video: {
                          name: 'video.mp4',
                          container: 'mp4',
                        },
                        workspace: {
                          id: workspaceID,
                        },
                        clips: [
                          {
                            name: 'video',
                            id: 'video',
                          },
                        ],
                        layers: [
                          {
                            clips: [
                              {
                                id: 'video',
                                from: 0, // Start time in seconds
                                to: totalDuration, // End time in seconds
                              },
                            ],
                          },
                        ],
                      },
                    };

                    this.apiService.postData('scenes', scene).subscribe({
                      next: (response) => {
                        console.log(response);
                      },
                      error: (error) => {

                      }
                    })
                  })
                  .catch(error => {
                    console.error('Error calculating video duration:', error);
                  });
                })
                .catch((error) => {
                  console.error("Error during file uploads:", error);
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

  getTotalVideoDuration(): Promise<number> {
    return new Promise((resolve, reject) => {
      let totalDuration = 0;
      let processedVideos = 0;
  
      this.videos.forEach((videoFile) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
  
        // When metadata is loaded, get the duration
        video.onloadedmetadata = () => {
          totalDuration += video.duration;
          processedVideos++;
  
          // Clean up the object URL after use
          window.URL.revokeObjectURL(video.src);
  
          // If all videos are processed, resolve the total duration
          if (processedVideos === this.videos.length) {
            resolve(totalDuration);
          }
        };
  
        // Handle error in loading video metadata
        video.onerror = () => {
          reject(new Error(`Failed to load metadata for one of the videos`));
        };

        // Create an object URL for the video file to load metadata
        video.src = URL.createObjectURL(videoFile.file);
      });
    });
  }  
}
