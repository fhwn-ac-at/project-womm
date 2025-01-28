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
  duration?: number;
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

                const uploadPromises: Promise<void>[] = [];

                this.videos.forEach(video => {
                    const size = video.file.size;

                    const workspaceString = `workspaces/${workspaceID}/files`;

                    const uploadPromise = new Promise<void>((resolve, reject) => {
                        this.apiService.putData(workspaceString, { "fileSize": size, "name": video.file.name }).subscribe({
                            next: (response) => {
                                console.log(response);

                                const uploadID = response.uploadId;
                                const maxPartSize = response.maxPartSize;

                                // Process uploads for this specific video
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

                                                const uploadString = `uploads/${uploadID}/part`;
                                                const formData = new FormData();
                                                formData.append('partNumber', (partIndex + 1).toString()); // Part number specific to this video
                                                formData.append('part', new Blob([byteArray]));

                                                this.apiService.postMultiFormData(uploadString, formData).subscribe({
                                                    next: () => {
                                                        console.log(`Uploaded part ${partIndex + 1} for file:`, file.name);
                                                        uploadPart(partIndex + 1).then(resolve).catch(reject); // Continue with the next part
                                                    },
                                                    error: (error) => {
                                                        console.error(`Error uploading part ${partIndex + 1} for file:`, file.name, error);
                                                        reject(error);
                                                    }
                                                });
                                            }
                                        };

                                        // Read the file slice as an ArrayBuffer
                                        reader.readAsArrayBuffer(fileSlice);
                                    });
                                };

                                // Start uploading parts for this video
                                uploadPart(0).then(() => {
                                    console.log(`Upload completed for file: ${file.name}`);
                                    resolve();
                                }).catch(error => {
                                    console.error(`Error during upload for file: ${file.name}`, error);
                                    reject(error);
                                });
                            },
                            error: (error) => {
                                console.error(`Error registering file size for video: ${video.file.name}`, error);
                                reject(error);
                            }
                        });
                    });

                    uploadPromises.push(uploadPromise);
                });

                // Wait for all uploads to complete
                Promise.all(uploadPromises)
                    .then(() => {
                        console.log("All uploads completed successfully. Proceeding to the next step.");

                        this.getTotalVideoDuration()
                            .then(totalDuration => {
                                console.log(`Total video duration: ${totalDuration.toFixed(2)} seconds`);

                                this.setVideoDurations()
                                .then( () => {
                                  // Create scene here after all uploads are done
                                let currentTime = 0;
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
                                        clips: this.videos.map(video => ({
                                            name: video.file.name,
                                            id: video.file.name,
                                        })),
                                        layers: [
                                            {
                                                clips: this.videos.map(video => {
                                                    const clip = {
                                                        id: video.file.name,
                                                        from: currentTime, // Start time in seconds
                                                        to: currentTime + video.duration!, // End time in seconds
                                                    };
                                                    currentTime += video.duration!; // Update current time for the next clip
                                                    return clip;
                                                }),
                                            },
                                        ],
                                    },
                                };

                                this.apiService.postData('scenes', scene).subscribe({
                                    next: (response) => {
                                        console.log("Scene created successfully", response);

                                        const renderURL = 'scenes/' + response.id + '/render';

                                        setTimeout(() => {
                                          this.apiService.postData(renderURL, {}).subscribe({
                                            next: (response) => {
                                              console.log("sent render command", response);
                                            }
                                          })
                                        }, 1000);
                                    },
                                    error: (error) => {
                                        console.error("Error creating scene", error);
                                    }
                                });
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

  setVideoDurations(): Promise<void> {
    return new Promise((resolve, reject) => {
        let processedVideos = 0;

        this.videos.forEach((video) => {
            const videoElement = document.createElement('video');
            videoElement.preload = 'metadata';

            // When metadata is loaded, set the duration
            videoElement.onloadedmetadata = () => {
                video.duration = videoElement.duration; // Set the duration property
                processedVideos++;

                // Clean up the object URL after use
                window.URL.revokeObjectURL(videoElement.src);

                // If all videos are processed, resolve the promise
                if (processedVideos === this.videos.length) {
                    resolve();
                }
            };

            // Handle error in loading video metadata
            videoElement.onerror = () => {
                reject(new Error(`Failed to load metadata for video: ${video.file.name}`));
            };

            // Create an object URL for the video file to load metadata
            videoElement.src = URL.createObjectURL(video.file);
        });
    });
  }
}
