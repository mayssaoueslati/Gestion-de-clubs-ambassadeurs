import { Injectable } from '@angular/core';
import { ChatMessage } from '../models/chat-message.model';
import { BehaviorSubject, Observable } from 'rxjs';
import SockJS from 'sockjs-client';
import * as Stomp from 'stompjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

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
  private apiUrl = environment.apiUrl;
  private reconnecting = false;
  private currentUsername: string | null = null;
  private currentSubscriptions: Map<string, any> = new Map(); 
 
  constructor(private http: HttpClient) { }
    
  connect(username: string): Promise<void> {
    this.currentUsername = username;
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token available');
      return Promise.reject(new Error('Authentication token required'));
    }
    return new Promise((resolve, reject) => {
      try {
        console.log('Connecting to WebSocket at:', this.socketEndpoint);
        const socket = new SockJS(this.socketEndpoint);
        this.stompClient = Stomp.over(socket);
                
        this.stompClient.debug = (str: string) => {
          console.log('STOMP: ' + str);
        };
                
        const token = localStorage.getItem('token');
        console.log('Using token:', token ? 'Bearer ' + token.substring(0, 10) + '...' : 'No token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
        this.stompClient.connect(
          headers,
          (frame: any) => {
            console.log('WebSocket connection established:', frame);
            this.connectionSubject.next(true);
            this.reconnecting = false;
                        
            this.subscribeToPublicChat();
                
            this.sendMessage(username, '', 'JOIN', 'public');
            resolve();
          },
          (error: any) => {
            console.error('WebSocket connection error:', error);
            console.error('WebSocket error details:', {
              headers: error.headers,
              body: error.body,
              command: error.command
            });
            this.connectionSubject.next(false);
            
            if (!this.reconnecting && this.currentUsername) {
              this.reconnecting = true;
              this.attemptReconnect(this.currentUsername);
            }
            
            reject(error);
          }
        );

        socket.onclose = () => {
          console.log('SockJS connection closed');
          this.connectionSubject.next(false);
          
          if (!this.reconnecting && this.currentUsername) {
            this.reconnecting = true;
            this.attemptReconnect(this.currentUsername);
          }
        };
        
      } catch (error) {
        console.error('Error establishing WebSocket connection:', error);
        this.connectionSubject.next(false);
        
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
      
      this.loadPublicChatHistory();
    } else {
      console.warn('Cannot subscribe to public chat, client not connected');
      this.ensureConnection().then(connected => {
        if (connected) {
          this.subscribeToPublicChat();
        }
      });
    }
  }
  
  subscribeToGroupChat(groupId: string): void {
    if (this.stompClient && this.stompClient.connected) {
      const topic = `/topic/group/${groupId}`;
      
      if (this.currentSubscriptions.has(topic)) {
        this.currentSubscriptions.get(topic).unsubscribe();
      }
      
      const subscription = this.stompClient.subscribe(topic, (payload: any) => {
        this.onMessageReceived(payload);
      });
      
      this.currentSubscriptions.set(topic, subscription);
      console.log(`Subscribed to group chat: ${groupId}`);
      
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
  public getPublicChatHistory(username: string) {
    if (this.stompClient && this.stompClient.connected) {
      if (this.currentSubscriptions.has('/user/queue/history')) {
        this.currentSubscriptions.get('/user/queue/history').unsubscribe();
        this.currentSubscriptions.delete('/user/queue/history');
      }
      
      const subscription = this.stompClient.subscribe('/user/queue/history', (message: any) => {
        const historyMessages = JSON.parse(message.body);
        console.log('Received public chat history:', historyMessages.length, 'messages');
        this.messageSubject.next(historyMessages);
      });
      
      this.currentSubscriptions.set('/user/queue/history', subscription);
      
      const requestMessage = {
        sender: username,
        type: 'HISTORY',
        chatId: 'public',
        content: '',
        timestamp: new Date()
      };
      
      // Send the history request
      this.stompClient.send('/app/chat.addUser', {}, JSON.stringify(requestMessage));
      
      // Also load via REST API for redundancy
      this.loadPublicChatHistory();
    } else {
      // If not connected, just use the REST API
      this.loadPublicChatHistory();
    }
  }
  public getGroupChatHistory(username: string, groupId: string) {
    if (this.stompClient && this.stompClient.connected) {
      // Create a message requesting history
      const requestMessage = {
        sender: username,
        type: 'HISTORY',
        chatId: groupId,
        content: '',
        timestamp: new Date()
      };
      
      // Subscribe to the specific group history queue
      this.stompClient.subscribe(`/user/queue/group-history/${groupId}`, (message: any) => {
        const historyMessages = JSON.parse(message.body);
        // Update the shared messages subject with history
        this.messageSubject.next(historyMessages);
      });
      
      // Send the group history request
      this.stompClient.send(`/app/chat.history/${groupId}`, {}, JSON.stringify(requestMessage));
    }
  }

  private loadGroupHistory(groupId: string): void {
    // First attempt via WebSocket
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.send(
        `/app/chat.history/${groupId}`,
        {},
        JSON.stringify({ sender: this.currentUsername })
      );
    }
    
    // Also load via REST API for redundancy
    this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/group/${groupId}`).subscribe({
      next: (messages) => {
        if (messages && messages.length > 0) {
          this.messageSubject.next(messages);
        }
      },
      error: (error) => {
        console.error('Error loading group chat history:', error);
      }
    });
  }
  
public loadPublicChatHistory(): void {
  this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/public`).subscribe({
    next: (messages) => {
      if (messages && messages.length > 0) {
        console.log('Loaded', messages.length, 'messages from REST API');
        this.messageSubject.next(messages);
      }
    },
    error: (error) => {
      console.error('Error loading public chat history:', error);
    }
  });
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