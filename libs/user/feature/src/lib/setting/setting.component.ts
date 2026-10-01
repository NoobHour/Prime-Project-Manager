import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IUserService } from '@mgmt/user/shared';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'mgmt-setting',
  templateUrl: './setting.component.html',
  styleUrls: ['./setting.component.scss'],
})
export class SettingComponent implements OnInit {
  form: FormGroup;
  message = '';
  busy = false;
  /** Accepts account and form services; initializes profile details and optional credential changes. */
  constructor(
    private users: IUserService,
    fb: FormBuilder,
  ) {
    this.form = fb.group({
      username: ['', [Validators.required, Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email]],
      jobTitle: ['', Validators.maxLength(100)],
      phone: ['', Validators.maxLength(80)],
      bio: ['', Validators.maxLength(1000)],
      image: ['', Validators.maxLength(500)],
      currentPassword: [''],
      password: [''],
      confirmPassword: [''],
    });
  }
  /** Accepts no input; loads persisted account fields without exposing password hashes. */
  async ngOnInit() {
    try {
      const user = await firstValueFrom(this.users.getCurrentUser());
      this.form.patchValue(user.detailData);
    } catch (e) {
      this.message = e.error?.message || 'Could not load settings.';
    }
  }
  /** Accepts no input; validates confirmation, saves profile/security changes and clears password fields. */
  async update() {
    if (this.busy || this.form.invalid) return;
    if (
      (this.form.value.password || '') !==
      (this.form.value.confirmPassword || '')
    ) {
      this.message = 'New passwords must match.';
      return;
    }
    this.busy = true;
    try {
      await firstValueFrom(this.users.update(null, this.form.value));
      this.form.patchValue({
        password: '',
        confirmPassword: '',
        currentPassword: '',
      });
      this.message = 'Changes saved.';
    } catch (e) {
      this.message = e.error?.message || 'Could not save settings.';
    } finally {
      this.busy = false;
    }
  }
}
