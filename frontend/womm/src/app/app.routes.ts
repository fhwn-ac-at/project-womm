import { Routes } from '@angular/router';
import {HomeComponent} from './home/home.component';
import { VideoListComponent } from './video-list/video-list.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'video-list', component: VideoListComponent }
];
