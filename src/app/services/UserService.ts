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

  /**
   * Get all users
   */
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  /**
   * Get chat groups for a user
   */
  getUserGroups(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${username}/groups`);
  }

  /**
   * Create a new chat group
   */
  createChatGroup(name: string, memberIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/groups`, {
      name,
      memberIds
    });
  }

  /**
   * Get group details
   */
  getGroupDetails(groupId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/groups/${groupId}`);
  }

  /**
   * Add user to group
   */
  addUserToGroup(groupId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/groups/${groupId}/members`, {
      userId
    });
  }

  /**
   * Remove user from group
   */
  removeUserFromGroup(groupId: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/groups/${groupId}/members/${userId}`);
  }
}