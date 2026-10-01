import { Component, NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Component({
  standalone: false,
  selector: 'mgmt-team',
  template: `<section class="team-page" aria-labelledby="team-title">
    <header>
      <h2 id="team-title">Team</h2>
      <p>Find a colleague, view their contact details and see assigned work.</p>
    </header>
    <p *ngIf="error" role="alert" class="text-danger">{{ error }}</p>
    <p *ngIf="loading" role="status">Loading team…</p>
    <p *ngIf="!loading && !error && !members.length">
      No team members to display.
    </p>
    <div class="team-grid">
      <article
        class="prime-naked-card team-card"
        *ngFor="let member of members"
      >
        <h3>
          <a [routerLink]="['/@' + member.username]">{{ member.username }}</a>
        </h3>
        <p class="member-title">{{ member.jobTitle || 'Team member' }}</p>
        <div class="member-contact">
          <a [href]="'mailto:' + member.email">{{ member.email }}</a>
          <a *ngIf="member.phone" [href]="'tel:' + member.phone">{{
            member.phone
          }}</a>
        </div>
        <a
          class="btn btn-outline-primary assigned-jobs"
          routerLink="/jobs"
          [queryParams]="{ assignee: member.id }"
          [attr.aria-label]="'Assigned Jobs for ' + member.username"
          >Assigned Jobs</a
        >
      </article>
    </div>
  </section>`,
  styleUrls: ['./team.scss'],
})
export class TeamComponent implements OnInit {
  members: any[] = [];
  error = '';
  loading = true;
  /** Accepts HTTP transport; initializes the enabled-staff directory. */
  constructor(private http: HttpClient) {}
  /** Accepts no input; resolves after authenticated team contacts or an error are displayed. */
  async ngOnInit() {
    try {
      const response: any = await firstValueFrom(this.http.get('/api/team'));
      this.members = response.listData;
    } catch (e) {
      this.error = e.error?.message || 'Could not load team.';
    } finally {
      this.loading = false;
    }
  }
}
@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{ path: '', component: TeamComponent }]),
  ],
  declarations: [TeamComponent],
})
export class TeamModule {}
