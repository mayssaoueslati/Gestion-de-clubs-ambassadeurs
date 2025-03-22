import { Injectable } from '@angular/core';
import { ChatMessage } from '../models/chat-message.model';
import { BehaviorSubject, Observable } from 'rxjs';
import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: any;
  private messageSubject: BehaviorSubject<ChatMessage[]> = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messageSubject.asObservable();
  private connectionSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public connection$: Observable<boolean> = this.connectionSubject.asObservable();
  
  private socketEndpoint = `${environment.apiUrl}/ws`;
  private reconnecting = false;
  private currentUsername: string | null = null;
  private currentSubscriptions: Map<string, any> = new Map(); // Keep track of active subscriptions
 
  constructor() { }
    
  connect(username: string): Promise<void> {
    this.currentUsername = username;
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token available');
      return Promise.reject(new Error('Authentication token required'));
    }
    return new Promise((resolve, reject) => {
      try {
        // Create a new SockJS instance
        console.log('Connecting to WebSocket at:', this.socketEndpoint);
        const socket = new SockJS(this.socketEndpoint);
        this.stompClient = Stomp.over(socket);
                
        // Enable debug logs temporarily to diagnose issues
        this.stompClient.debug = (str: string) => {
          console.log('STOMP: ' + str);
        };
                
        // Add JWT token to initial connection handshake
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? 'Bearer ' + token.substring(0, 10) + '...' : 'No token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
        this.stompClient.connect(
          headers,
          (frame: any) => {
            console.log('WebSocket connection established:', frame);
            this.connectionSubject.next(true);
            this.reconnecting = false;
                        
            // Subscribe to the Public Topic by default
            this.subscribeToPublicChat();
                
            // Tell your username to the server
            this.sendMessage(username, '', 'JOIN', 'public');
            resolve();
          },
          (error: any) => {
            // Enhanced error logging
            console.error('WebSocket connection error:', error);
            console.error('WebSocket error details:', {
              headers: error.headers,
              body: error.body,
              command: error.command
            });
            this.connectionSubject.next(false);
            
            // Attempt to reconnect if not already reconnecting
            if (!this.reconnecting && this.currentUsername) {
              this.reconnecting = true;
              this.attemptReconnect(this.currentUsername);
            }
            
            reject(error);
          }
        );
        // Add event handler for SockJS close events
        socket.onclose = () => {
          console.log('SockJS connection closed');
          this.connectionSubject.next(false);
          
          // Attempt to reconnect if not already reconnecting
          if (!this.reconnecting && this.currentUsername) {
            this.reconnecting = true;
            this.attemptReconnect(this.currentUsername);
          }
        };
        
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        this.connectionSubject.next(false);
        
        // Attempt to reconnect if not already reconnecting
        if (!this.reconnecting && this.currentUsername) {
          this.reconnecting = true;
          this.attemptReconnect(this.currentUsername);
        }
        
        reject(error);
      }
    });
  }
  
  private attemptReconnect(username: string, attempt = 0, maxAttempts = 5): void {
    if (attempt >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.reconnecting = false;
      return;
    }
    
    const timeout = 2000 * Math.pow(1.5, attempt); // Exponential backoff
    console.log(`Attempting to reconnect (${attempt + 1}/${maxAttempts}) in ${timeout}ms...`);
    
    setTimeout(() => {
      this.connect(username).then(() => {
        console.log('Reconnection successful');
        this.reconnecting = false;
      }).catch(error => {
        console.error('Reconnection failed:', error);
        this.attemptReconnect(username, attempt + 1, maxAttempts);
      });
    }, timeout);
  }
 
  disconnect(): void {
    if (this.stompClient && this.stompClient.connected) {
      const username = this.currentUsername || localStorage.getItem('chat-username');
      if (username) {
        this.sendMessage(username, '', 'LEAVE', 'public');
      }
      
      // Unsubscribe from all topics
      this.currentSubscriptions.forEach((subscription, topic) => {
        subscription.unsubscribe();
      });
      this.currentSubscriptions.clear();
      
      this.stompClient.disconnect(() => {
        console.log('WebSocket disconnected gracefully');
        this.connectionSubject.next(false);
        this.currentUsername = null;
      });
    } else {
      this.connectionSubject.next(false);
      this.currentUsername = null;
    }
  }
 
  sendMessage(sender: string, content: string, type: string, chatId: string = 'public'): void {
    if (this.stompClient && this.stompClient.connected) {
      const chatMessage = new ChatMessage(sender, content, type, chatId);
      
      const destination = type === 'CHAT' ? 
        `/app/chat.sendMessage/${chatId}` : 
        '/app/chat.addUser';
        
      this.stompClient.send(
        destination,
        {},
        JSON.stringify(chatMessage)
      );
    } else {
      console.warn('Cannot send message, client not connected');
      
      // Try to reconnect if not already reconnecting
      if (!this.reconnecting && this.currentUsername) {
        this.reconnecting = true;
        this.attemptReconnect(this.currentUsername);
      }
    }
  }
 
  private onMessageReceived(payload: any): void {
    const message: ChatMessage = JSON.parse(payload.body);
    const currentMessages = this.messageSubject.getValue();
        
    // For JOIN and LEAVE messages, set content appropriately
    if (message.type === 'JOIN') {
      message.content = `${message.sender} joined!`;
    } else if (message.type === 'LEAVE') {
      message.content = `${message.sender} left!`;
    }
        
    this.messageSubject.next([...currentMessages, message]);
  }
 
  clearMessages(): void {
    this.messageSubject.next([]);
  }
  
  // Method to subscribe to public chat
  subscribeToPublicChat(): void {
    if (this.stompClient && this.stompClient.connected) {
      // Unsubscribe if already subscribed
      if (this.currentSubscriptions.has('/topic/public')) {
        this.currentSubscriptions.get('/topic/public').unsubscribe();
      }
      
      // Subscribe to the public topic
      const subscription = this.stompClient.subscribe('/topic/public', (payload: any) => {
        this.onMessageReceived(payload);
      });
      
      // Store the subscription
      this.currentSubscriptions.set('/topic/public', subscription);
      console.log('Subscribed to public chat');
    } else {
      console.warn('Cannot subscribe to public chat, client not connected');
      this.ensureConnection().then(connected => {
        if (connected) {
          this.subscribeToPublicChat();
        }
      });
    }
  }
  
  // Method to subscribe to group chat
  subscribeToGroupChat(groupId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      const topic = `/topic/group/${groupId}`;
      
      // Unsubscribe if already subscribed
      if (this.currentSubscriptions.has(topic)) {
        this.currentSubscriptions.get(topic).unsubscribe();
      }
      
      // Subscribe to the group topic
      const subscription = this.stompClient.subscribe(topic, (payload: any) => {
        this.onMessageReceived(payload);
      });
      
      // Store the subscription
      this.currentSubscriptions.set(topic, subscription);
      console.log(`Subscribed to group chat: ${groupId}`);
      
      // Load previous messages for this group
      this.loadGroupHistory(groupId);
    } else {
      console.warn('Cannot subscribe to group chat, client not connected');
      this.ensureConnection().then(connected => {
        if (connected) {
          this.subscribeToGroupChat(groupId);
        }
      });
    }
  }
  
  // Method to unsubscribe from chat
  unsubscribeFromChat(chatId: string): void {
    let topic;
    
    if (chatId === 'public') {
      topic = '/topic/public';
    } else {
      topic = `/topic/group/${chatId}`;
    }
    
    if (this.currentSubscriptions.has(topic)) {
      this.currentSubscriptions.get(topic).unsubscribe();
      this.currentSubscriptions.delete(topic);
      console.log(`Unsubscribed from chat: ${chatId}`);
    }
  }
  
  // Method to load message history for a group
  private loadGroupHistory(groupId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.send(
        `/app/chat.history/${groupId}`,
        {},
        JSON.stringify({ sender: this.currentUsername })
      );
    }
  }
  
  // Method to check connection status and reconnect if needed
  ensureConnection(): Promise<boolean> {
    if (this.stompClient && this.stompClient.connected) {
      return Promise.resolve(true);
    } else if (this.currentUsername && !this.reconnecting) {
      return this.connect(this.currentUsername)
        .then(() => true)
        .catch(() => false);
    }
    return Promise.resolve(false);
  }
}