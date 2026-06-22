import { Component } from '@angular/core';

@Component({
    selector: 'hf-public-footer',
    templateUrl: './public-footer.component.html',
    styleUrls: ['./public-footer.component.scss'],
    standalone: false,
})
export class PublicFooterComponent {
    currentYear = new Date().getFullYear();
}
