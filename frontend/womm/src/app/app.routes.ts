import { Routes } from '@angular/router';
import {HomeComponent} from './home/home.component';
import {VideoEditorComponent} from './video-editor/video-editor.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'video-editor', component: VideoEditorComponent }
];
