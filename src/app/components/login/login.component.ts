import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthenticationService } from '../../services/authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule] 

})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;
  returnUrl: string;

  constructor(
    private authService: AuthenticationService, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/chat';
  }

  login(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Username and password are required';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    
    this.authService.login(this.username, this.password).subscribe(
      response => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('role', response.role);
        localStorage.setItem('userId', response.userId);
        localStorage.setItem('chat-username', this.username);
        
        this.loading = false;
        this.router.navigate([this.returnUrl]);
      },
      error => {
        this.loading = false;
        if (error.status === 401) {
          this.errorMessage = 'Invalid username or password';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        console.error('Login error:', error);
      }
    );
  }
}