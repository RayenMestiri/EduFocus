import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    // Validation
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
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

    if (this.password !== this.confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#ffd700'
      });
      return;
    }

    if (this.password.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#ffd700'
      });
      return;
    }

    this.isLoading = true;
    this.authService.register(this.name, this.email, this.password).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Account Created!',
          text: 'Registration successful',
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
          title: 'Registration Failed',
          text: err.error?.message || 'Something went wrong',
          background: '#1a1a1a',
          color: '#ffd700',
          confirmButtonColor: '#ffd700'
        });
      }
    });
  }
}
