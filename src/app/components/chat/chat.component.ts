import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { WebSocketService } from '../../services/websocket.service';
import { AuthenticationService } from '../../services/authentication.service';
import { UserService } from '../../services/UserService';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../models/chat-message.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  messages: ChatMessage[] = [];
  messageContent: string = '';
  isConnected: boolean = false;
  private subscription: Subscription = new Subscription();
  @ViewChild('messageList') messageList!: ElementRef;
  username: string = '';
  
  // Group chat variables
  showGroupModal: boolean = false;
  groupName: string = '';
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];
  searchTerm: string = '';
  currentChat: string = 'public'; // 'public' or group ID
  userGroups: any[] = [];
  
  constructor(
    private webSocketService: WebSocketService,
    private authService: AuthenticationService,
    private userService: UserService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.username = localStorage.getItem('chat-username') || 'user';
    
    // Subscribe to WebSocket messages
    this.subscription.add(
      this.webSocketService.messages$.subscribe(messages => {
        this.messages = messages;
      })
    );
    
    // Subscribe to connection status
    this.subscription.add(
      this.webSocketService.connection$.subscribe(connected => {
        this.isConnected = connected;
      })
    );
    
    // Get user groups
    this.loadUserGroups();
    
    // Load all users
    this.loadAllUsers();
    
    this.startChat();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    // Properly clean up subscriptions
    this.subscription.unsubscribe();
    // Disconnect WebSocket
    this.webSocketService.disconnect();
  }

  startChat() {
    if (this.authService.isAuthenticated()) {
      this.webSocketService.connect(this.username)
        .then(() => {
          console.log('Connected to chat');
        })
        .catch(error => {
          console.error('Failed to connect:', error);
        });
    } else {
      console.error('User not authenticated');
    }
  }

  logout() {
    // Disconnect from WebSocket
    this.webSocketService.disconnect();
    
    // Logout from authentication service
    this.authService.clientLogout();
    this.authService.logout().subscribe({
      next: () => console.log('Logged out successfully'),
      error: (err) => console.error('Error during logout:', err)
    });
  }

  getAvatarColor(sender: string): string {
    // Generate consistent color based on the username
    let hash = 0;
    for (let i = 0; i < sender.length; i++) {
      hash = sender.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  sendMessage() {
    if (this.messageContent.trim() && this.isConnected) {
      // Send through WebSocket service
      this.webSocketService.sendMessage(
        this.username,
        this.messageContent.trim(),
        'CHAT',
        this.currentChat
      );
      
      // Clear input field
      this.messageContent = '';
    }
  }

  private scrollToBottom(): void {
    try {
      const element = this.messageList.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  
  // Group chat functions
  openGroupModal() {
    this.showGroupModal = true;
    this.groupName = '';
    this.selectedUsers = [];
    this.searchTerm = '';
    this.filterUsers();
  }
  
  closeGroupModal() {
    this.showGroupModal = false;
  }
  
  loadAllUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers = users.filter(user => user.username !== this.username);
        this.filteredUsers = [...this.allUsers];
      },
      error: (error) => console.error('Error loading users:', error)
    });
  }
  
  loadUserGroups() {
    this.userService.getUserGroups(this.username).subscribe({
      next: (groups) => {
        this.userGroups = groups;
      },
      error: (error) => console.error('Error loading groups:', error)
    });
  }
  
  filterUsers() {
    if (!this.searchTerm) {
      this.filteredUsers = this.allUsers.filter(user => 
        !this.selectedUsers.some(selected => selected.id === user.id)
      );
      return;
    }
    
    const searchLower = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user => 
      user.username.toLowerCase().includes(searchLower) && 
      !this.selectedUsers.some(selected => selected.id === user.id)
    );
  }
  
  selectUser(user: any) {
    this.selectedUsers.push(user);
    this.filterUsers();
  }
  
  removeUser(user: any) {
    this.selectedUsers = this.selectedUsers.filter(u => u.id !== user.id);
    this.filterUsers();
  }
  
  createGroup() {
    if (!this.groupName.trim() || this.selectedUsers.length === 0) {
      alert('Please enter a group name and select at least one user');
      return;
    }
    
    const memberIds = this.selectedUsers.map(user => user.id);
    memberIds.push(this.authService.getCurrentUserId()); // Add current user
    
    this.userService.createChatGroup(this.groupName, memberIds).subscribe({
      next: (group) => {
        this.userGroups.push(group);
        this.closeGroupModal();
        this.switchChat(group.id);
      },
      error: (error) => console.error('Error creating group:', error)
    });
  }
  
  switchChat(chatId: string) {
    // Unsubscribe from current chat
    if (this.currentChat !== 'public') {
      this.webSocketService.unsubscribeFromChat(this.currentChat);
    }
    
    // Subscribe to new chat
    this.currentChat = chatId;
    this.webSocketService.clearMessages();
    
    if (chatId === 'public') {
      this.webSocketService.subscribeToPublicChat();
    } else {
      this.webSocketService.subscribeToGroupChat(chatId);
    }
  }
  
  getChatName(chatId: string): string {
    if (chatId === 'public') return 'Public Chat';
    const group = this.userGroups.find(g => g.id === chatId);
    return group ? group.name : 'Unknown Group';
  }
}