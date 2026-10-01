import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IUserService } from '@mgmt/user/shared';
@Component({
  standalone: false,
  selector: 'mgmt-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  profile: any;
  jobs: any[] = [];
  total = 0;
  error = '';
  /** Accepts routing, transport and account services; initializes the colleague profile. */
  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    public userService: IUserService,
  ) {}
  /** Accepts no input; loads the routed profile and its open assigned jobs. */
  async ngOnInit() {
    try {
      const name = this.route.parent.snapshot.url[0].path.slice(1);
      const response: any = await firstValueFrom(
        this.http.get('/api/profiles/' + encodeURIComponent(name)),
      );
      this.profile = response.detailData;
      const jobs: any = await firstValueFrom(
        this.http.get('/api/jobs', {
          params: { assignee: this.profile.id, limit: 10 },
        }),
      );
      this.jobs = jobs.listData;
      this.total = jobs.total;
    } catch (e) {
      this.error = e.error?.message || 'Could not load profile.';
    }
  }
  /** Accepts a display name; returns two initials for the fallback avatar. */
  initials(name: string) {
    return (name || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
}
