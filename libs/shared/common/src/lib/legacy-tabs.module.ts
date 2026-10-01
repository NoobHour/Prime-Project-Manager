import {
  AfterContentInit,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  Input,
  NgModule,
  OnDestroy,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Preserve the original projected tab markup after PrimeNG removed TabView.
@Component({
  standalone: false,
  selector: 'p-tabPanel',
  template:
    '<section role="tabpanel" [id]="panelId" [attr.aria-labelledby]="labelledBy" [hidden]="!active"><ng-content></ng-content></section>',
})
export class LegacyTabPanel {
  @Input() header = '';
  active = false;
  panelId = '';
  labelledBy = '';
}
@Component({
  standalone: false,
  selector: 'p-tabView',
  template: `<div class="p-tabview">
    <ul class="p-tabview-nav" role="tablist" [attr.aria-label]="label">
      <li
        *ngFor="let panel of panels; let i = index"
        [class.p-highlight]="i === selected"
      >
        <button
          type="button"
          role="tab"
          class="p-tabview-nav-link"
          [id]="panel.labelledBy"
          [attr.aria-controls]="panel.panelId"
          [attr.aria-selected]="i === selected"
          [attr.tabindex]="i === selected ? 0 : -1"
          (click)="select(i)"
          (keydown)="navigate($event, i)"
        >
          {{ panel.header }}
        </button>
      </li>
    </ul>
    <div class="p-tabview-panels"><ng-content></ng-content></div>
  </div>`,
})
export class LegacyTabView implements AfterContentInit, OnDestroy {
  @Input() label = 'Tabs';
  @ContentChildren(LegacyTabPanel) panels!: QueryList<LegacyTabPanel>;
  selected = 0;
  private static nextId = 0;
  private readonly id = 'ppm-tabs-' + LegacyTabView.nextId++;
  private panelChanges?: Subscription;
  /** Accepts Angular change detection; creates a tab host without fetching data. */
  constructor(private changes: ChangeDetectorRef) {}
  /** Accepts no arguments; selects the first projected tab once children are available. */
  ngAfterContentInit() {
    this.select(0);
    this.panelChanges = this.panels.changes.subscribe(() =>
      this.select(Math.min(this.selected, this.panels.length - 1)),
    );
    this.changes.detectChanges();
  }
  /** Accepts a tab index; updates which existing projected panel is visible. */
  select(index: number) {
    this.selected = Math.max(0, Math.min(index, this.panels.length - 1));
    this.panels.forEach((panel, i) => {
      panel.active = i === this.selected;
      panel.panelId = `${this.id}-panel-${i}`;
      panel.labelledBy = `${this.id}-tab-${i}`;
    });
  }
  /** Accepts a tab key event and its index; selects/focuses the adjacent or endpoint tab while keeping all panel state mounted. */
  navigate(event: KeyboardEvent, index: number) {
    const count = this.panels.length;
    if (!count || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
    this.select(next);
    const button = event.currentTarget as HTMLElement;
    button.parentElement?.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
  /** Accepts no input; releases the projected-panel subscription when its tab host is destroyed. */
  ngOnDestroy() {
    this.panelChanges?.unsubscribe();
  }
}
@NgModule({
  imports: [CommonModule],
  declarations: [LegacyTabPanel, LegacyTabView],
  exports: [LegacyTabPanel, LegacyTabView],
})
export class TabViewModule {}
