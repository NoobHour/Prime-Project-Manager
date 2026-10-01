import { APP_BRAND } from '@mgmt/shared/client-server';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
import { UserStorageUtil } from '@mgmt/shared/storage';
@Component({
  standalone: false,
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  brand = APP_BRAND;
  form: FormGroup;
  setup = false;
  demo = false;
  sandbox = false;
  error = '';
  busy = false;
  /** Accepts Angular form, HTTP, navigation and existing auth services; creates the sign-in form. */
  constructor(
    fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private users: IUserService,
    private storage: UserStorageUtil,
  ) {
    this.form = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      username: [''],
      code: [''],
    });
  }
  /** Accepts no input; checks whether this database needs its first administrator. */
  async ngOnInit() {
    try {
      const status = await firstValueFrom(this.http.get<any>('/api/setup'));
      this.setup = status.required;
      this.demo = status.demo === true;
      this.sandbox = status.sandbox === true;
    } catch {
      this.error = 'Unable to reach the API.';
    }
  }
  /** Accepts a demo account type; signs into the isolated fixture database using its documented credentials. */
  enterDemo(staff = false) {
    if (!this.demo) return;
    this.form.patchValue({
      email: staff ? 'demo.staff@example.test' : 'demo.admin@example.test',
      password: 'Prime-Demo-2026!',
    });
    this.login();
  }
  /** Accepts no input; submits valid login/setup fields and opens the existing home route. */
  async login() {
    if (this.form.invalid || this.busy) return;
    this.error = '';
    this.busy = true;
    try {
      if (this.setup) {
        const response = await firstValueFrom(
          this.http.post<any>('/api/setup', this.form.value),
        );
        this.storage.setUserData(response);
        this.users.updateAuthState(response.data);
      } else await firstValueFrom(this.users.login(this.form.value));
      await this.router.navigateByUrl('/');
    } catch (e: any) {
      this.error = e.error?.message || 'Sign-in failed.';
    } finally {
      this.busy = false;
    }
  }
}
