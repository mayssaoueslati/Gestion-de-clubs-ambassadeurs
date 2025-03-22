import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Add the getToken method
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Add the login method
  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/auth/login`, { username, password })
      .pipe(
        tap(response => {
          if (response && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('chat-username', username);
            
            // Store user data if available
            if (response.user) {
              localStorage.setItem('user-data', JSON.stringify(response.user));
            }
          }
        })
      );
  }

  getCurrentUserId(): string {
    const userData = JSON.parse(localStorage.getItem('user-data') || '{}');
    return userData.id || '';
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  clientLogout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user-data');
    localStorage.removeItem('chat-username');
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/api/auth/logout`, { })
  }
}