import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'http://localhost:8080/api/users'; 

  constructor(private http: HttpClient) {}

  getUsers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/allUsers`);
  }

  getUser(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`); 
  }

  createUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/addUser`, user); 
  }

  updateUser(id: number, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, user); 
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`); 
  }
  login(email: string, password: string): Observable<any>{
      return this.http.post(`${this.apiUrl}/login`,{email,password});
  }
}
