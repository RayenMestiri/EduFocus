import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  email = '';
  password = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (!this.email || !this.password) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill all fields',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#ffd700'
      });
      return;
    }

    this.isLoading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Welcome Back!',
          text: 'Login successful',
          background: '#1a1a1a',
          color: '#ffd700',
          confirmButtonColor: '#ffd700',
          timer: 1500,
          showConfirmButton: false
        });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: err.error?.message || 'Invalid credentials',
          background: '#1a1a1a',
          color: '#ffd700',
          confirmButtonColor: '#ffd700'
        });
      }
    });
  }
}
