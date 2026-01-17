import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-user.html',
  styleUrls: ['./login-user.css']
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;

  login() {
    console.log('Login:', this.email, this.password);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}