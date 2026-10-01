import { NgModule } from '@angular/core';
import { SharedCommonModule } from '@mgmt/shared/common';
import { FileUtilComponent } from './file-util.component';

@NgModule({
  imports: [SharedCommonModule],

  declarations: [FileUtilComponent],
  exports: [FileUtilComponent],
})
export class FileUtilModule {}
