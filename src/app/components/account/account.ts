import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface UserInfo {
  id: string;
  email: string;
  role: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrls: ['./account.css'],
})
export class AccountComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  loading = true;
  error: string | null = null;

  user: UserInfo = {
    id: '',
    email: '',
    role: '',
  };

  // Password modal
  showPasswordModal = false;
  savingPassword = false;
  passwordError: string | null = null;
  passwordSuccess = false;

  // Toggle eye
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  passwordForm: PasswordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadAccount();
    } else {
      this.loading = false;
    }
  }

  loadAccount(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.http.get<UserInfo>('/api/Users/me').subscribe({
      next: (res) => {
        this.user = res;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Não foi possível carregar as informações da conta.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openPasswordModal(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    this.passwordError = null;
    this.passwordSuccess = false;
    this.showCurrent = false;
    this.showNew = false;
    this.showConfirm = false;
    this.showPasswordModal = true;
  }

  closePasswordModal(): void {
    this.showPasswordModal = false;
    this.passwordError = null;
  }

  toggleCurrentPassword(): void {
    this.showCurrent = !this.showCurrent;
  }

  toggleNewPassword(): void {
    this.showNew = !this.showNew;
  }

  toggleConfirmPassword(): void {
    this.showConfirm = !this.showConfirm;
  }

  savePassword(): void {
    this.passwordError = null;
    this.passwordSuccess = false;

    if (!this.passwordForm.currentPassword) {
      this.passwordError = 'Informe a senha atual.';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'A nova senha deve ter pelo menos 6 caracteres.';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'As senhas não coincidem.';
      return;
    }

    if (!this.user.id) {
      this.passwordError = 'Usuário não identificado.';
      return;
    }

    this.savingPassword = true;

    this.http.put(`/api/Users/update-password/${this.user.id}`, {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
      confirmPassword: this.passwordForm.confirmPassword,
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.showPasswordModal = false;
        this.passwordSuccess = true;
        this.cdr.markForCheck();

        setTimeout(() => {
          this.passwordSuccess = false;
          this.cdr.markForCheck();
        }, 4000);
      },
      error: (err) => {
        this.savingPassword = false;

        const messages: string[] = err?.error?.errors ?? [];
        this.passwordError = messages.length
          ? messages.join(' ')
          : 'Erro ao alterar a senha. Verifique a senha atual e tente novamente.';

        this.cdr.markForCheck();
      },
    });
  }
}