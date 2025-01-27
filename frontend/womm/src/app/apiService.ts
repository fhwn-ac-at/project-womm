import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment'; // If you have a base URL in environment

@Injectable({
  providedIn: 'root', // Makes this service globally available
})
export class ApiService {
  private baseUrl: string = environment.apiURL; // Base URL from environment files

  constructor(private http: HttpClient) {}

  // GET request
  getData(endpoint: string): Observable<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.get(url);
  }

  // POST request
  postData(endpoint: string, body: any): Observable<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.post(url, body, {
      headers: new HttpHeaders().set('Content-Type', 'application/json'),
    });
  }

  // PUT request
  putData(endpoint: string, body: any): Observable<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.put(url, body, {
      headers: new HttpHeaders().set('Content-Type', 'application/json'),
    });
  }

  // DELETE request
  deleteData(endpoint: string): Observable<any> {
    const url = `${this.baseUrl}/${endpoint}`;
    return this.http.delete(url);
  }
}
