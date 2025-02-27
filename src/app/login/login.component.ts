import { Component, OnInit } from '@angular/core';
import {UserService} from '../user.service';
import {Router} from '@angular/router';
import { response } from 'express';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  email='';
  password='';
  errorMessage='';

  constructor(private userService : UserService, private router : Router) { }

  login(){
    this.userService.login(this.email, this.password).subscribe(
      response =>{
      localStorage.setItem('user',JSON.stringify(response));
      this.router.navigate(['/dashboard']);
      },
      error => {
        this.errorMessage='Invalid email or password!';
      }

      );

  }

  ngOnInit(): void {
  }

}
