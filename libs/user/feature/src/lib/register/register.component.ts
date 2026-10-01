import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
@Component({
  standalone: false,
  selector: 'register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit {
  form: FormGroup;
  staff: any[] = [];
  error = '';
  busy = false;
  /** Accepts HTTP, form and current-account services; prepares administrator staff creation. */
  constructor(
    private http: HttpClient,
    fb: FormBuilder,
    public users: IUserService,
  ) {
    this.form = fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(12)]],
    });
  }
  /** Accepts no arguments; loads authorized staff records. */
  ngOnInit() {
    this.load();
  }
  /** Accepts no arguments; refreshes staff without affecting the administrator's session. */
  async load() {
    try {
      const r: any = await firstValueFrom(this.http.get('/api/staff'));
      this.staff = r.listData;
    } catch (e) {
      this.error = e.error?.message || 'Could not load staff.';
    }
  }
  /** Accepts no arguments; creates a staff account and clears the password field. */
  async submit() {
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    try {
      await firstValueFrom(this.http.post('/api/users', this.form.value));
      this.form.reset();
      await this.load();
    } catch (e) {
      this.error = e.error?.message || 'Could not create account.';
    } finally {
      this.busy = false;
    }
  }
  /** Accepts a staff row; changes its enabled state and invalidates previous sessions. */
  async toggle(user: any) {
    if (!confirm(`${user.active ? 'Disable' : 'Enable'} ${user.username}?`))
      return;
    try {
      await firstValueFrom(
        this.http.put('/api/staff/' + user.id, { active: !user.active }),
      );
      await this.load();
    } catch (e) {
      this.error = e.error?.message || 'Could not change account.';
    }
  }
}
