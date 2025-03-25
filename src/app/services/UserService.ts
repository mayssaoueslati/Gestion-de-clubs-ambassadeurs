import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  
  getAllUsers(): Observable<any[]> {
    console.log('API URL:', `${this.apiUrl}/users`); 

    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  
  getUserGroups(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${username}/groups`);
  }
searchUsers(query: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/search-users?query=${query}`);
}




  
  createChatGroup(name: string, memberIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/groups`, {
      name,
      memberIds
    });
  }

 
  getGroupDetails(groupId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/groups/${groupId}`);
  }

  
  addUserToGroup(groupId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/groups/${groupId}/members`, {
      userId
    });
  }

  
  removeUserFromGroup(groupId: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/groups/${groupId}/members/${userId}`);
  }
}