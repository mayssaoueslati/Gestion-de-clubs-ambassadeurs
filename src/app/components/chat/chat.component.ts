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
  
  showGroupModal: boolean = false;
  groupName: string = '';
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsers: any[] = [];
  searchTerm: string = '';
  currentChat: string = 'public'; 
  userGroups: any[] = [];
  
  showGroupMembersModal: boolean = false;
  currentGroupMembers: any[] = [];
  chatHistory: Map<string, ChatMessage[]> = new Map<string, ChatMessage[]>();
  
  constructor(
    private webSocketService: WebSocketService,
    public authService: AuthenticationService,
    private userService: UserService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.username = localStorage.getItem('chat-username') || 'user';
    
    this.subscription.add(
      this.webSocketService.messages$.subscribe(messages => {
        this.messages = messages;
        
        if (this.currentChat) {
          this.chatHistory.set(this.currentChat, [...messages]);
        }
      })
    );
    
    this.subscription.add(
      this.webSocketService.connection$.subscribe(connected => {
        this.isConnected = connected;
        
        // When connection is established, load messages for current chat
        if (connected && this.currentChat) {
          this.switchChat(this.currentChat);
        }
      })
    );
    
    this.loadUserGroups();
    this.loadAllUsers();
    this.startChat();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
    this.webSocketService.disconnect();
    
    this.authService.clientLogout();
    this.authService.logout().subscribe({
      next: () => console.log('Logged out successfully'),
      error: (err) => console.error('Error during logout:', err)
    });
  }

  getAvatarColor(sender: string): string {
    let hash = 0;
    for (let i = 0; i < sender.length; i++) {
      hash = sender.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  sendMessage() {
    if (this.messageContent.trim() && this.isConnected) {
      this.webSocketService.sendMessage(
        this.username,
        this.messageContent.trim(),
        'CHAT',
        this.currentChat
      );
      
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
        console.log('All users:', users); 
        this.allUsers = users.filter(user => user.username !== this.username);
        this.filteredUsers = [...this.allUsers];
       // this.selectedUsers=this.filteredUsers;
        console.log('Filtered users:', this.filteredUsers); // Add this line
      },
      error: (error) => {
        console.error('Error loading users:', error);
        console.error('Full error:', error);
      }
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
    if (!this.searchTerm || this.searchTerm.length < 2) {
      this.filteredUsers = this.allUsers.filter(user => 
        !this.selectedUsers.some(selected => selected.id === user.id)
      );
      return;
    }
    
    this.userService.searchUsers(this.searchTerm).subscribe({
      next: (users) => {
        this.filteredUsers = users.filter(user => 
          !this.selectedUsers.some(selected => selected.id === user.id)
        );
      },
      error: (error) => console.error('Error searching users:', error)
    });
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
    memberIds.push(this.authService.getCurrentUserId());
    
    this.userService.createChatGroup(this.groupName, memberIds).subscribe({
      next: (group) => {
        this.userGroups.push(group);
        this.closeGroupModal();
        this.switchChat(group.id);
      },
      error: (error) => console.error('Error creating group:', error)
    });
  }
  
  
  
  getChatName(chatId: string): string {
    if (chatId === 'public') return 'Public Chat';
    const group = this.userGroups.find(g => g.id === chatId);
    return group ? group.name : 'Unknown Group';
  }
  
  loadGroupMembers(groupId: string) {
    if (groupId === 'public') return;
    
    this.userService.getGroupDetails(groupId).subscribe({
      next: (group) => {
        this.currentGroupMembers = group.members || [];
      },
      error: (error) => console.error('Error loading group members:', error)
    });
  }
  
  openGroupMembersModal() {
    if (this.currentChat !== 'public') {
      this.showGroupMembersModal = true;
    }
  }
  
  closeGroupMembersModal() {
    this.showGroupMembersModal = false;
  }
  
  addMemberToGroup(userId: string) {
    this.userService.addUserToGroup(this.currentChat, userId).subscribe({
      next: () => {
        this.loadGroupMembers(this.currentChat);
      },
      error: (error) => console.error('Error adding member:', error)
    });
  }
  switchChat(chatId: string) {
    if (this.currentChat !== 'public') {
      this.webSocketService.unsubscribeFromChat(this.currentChat);
    }
    
    this.currentChat = chatId;
    
    const existingHistory = this.chatHistory.get(chatId);
    if (existingHistory && existingHistory.length > 0) {
      this.webSocketService.clearMessages();
      this.messages = [...existingHistory];
    } else {
      this.webSocketService.clearMessages();
      
      if (chatId === 'public') {
        this.webSocketService.subscribeToPublicChat();
        this.webSocketService.getPublicChatHistory(this.username);
      } else {
        this.webSocketService.subscribeToGroupChat(chatId);
        this.webSocketService.getGroupChatHistory(this.username, chatId);
        this.loadGroupMembers(chatId);
      }
    }
  }
  
  removeMemberFromGroup(userId: string) {
    if (userId === this.authService.getCurrentUserId()) {
      alert('You cannot remove yourself from the group');
      return;
    }
    
    this.userService.removeUserFromGroup(this.currentChat, userId).subscribe({
      next: () => {
        this.loadGroupMembers(this.currentChat);
      },
      error: (error) => console.error('Error removing member:', error)
    });
  }
}