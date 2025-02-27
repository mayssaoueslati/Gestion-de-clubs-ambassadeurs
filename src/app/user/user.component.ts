import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  users: any[] = [];
  newUser = { name: '', email: '' };
  editUser: any = null;

  constructor(private userService: UserService) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.userService.getUsers().subscribe(data => {
      this.users = data;
    });
  }

  addUser() {
    this.userService.createUser(this.newUser).subscribe(() => {
      this.loadUsers();
      this.newUser = { name: '', email: '' }; 
    });
  }

  setEditUser(user: any) {
    this.editUser = { ...user }; // ya3mel copy user data for editing
  }

  updateUser() {
    this.userService.updateUser(this.editUser.id, this.editUser).subscribe(() => {
      this.loadUsers();
      this.editUser = null; 
    });
  }

  deleteUser(id: number) {
    this.userService.deleteUser(id).subscribe(() => { 
      this.loadUsers();
    });
  }
}
