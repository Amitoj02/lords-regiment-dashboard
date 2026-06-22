import { Component } from '@angular/core';
import { Rank, Medal, MedalRibbon } from '../../../core/models/member.model';

@Component({
    selector: 'app-ranks-medals',
    templateUrl: './ranks-medals.component.html',
    styleUrls: ['./ranks-medals.component.scss'],
    standalone: false,
})
export class RanksMedalsComponent {
    ranks: Rank[] = [
        {
            name: 'General',
            chevrons: 5,
            holders: 1,
            discordRole: '@General',
            discordLinked: true,
            order: 1,
        },
        {
            name: 'Colonel',
            chevrons: 4,
            holders: 2,
            discordRole: '@Colonel',
            discordLinked: true,
            order: 2,
        },
        {
            name: 'Major',
            chevrons: 4,
            holders: 3,
            discordRole: '@Major',
            discordLinked: true,
            order: 3,
        },
        {
            name: 'Captain',
            chevrons: 3,
            holders: 5,
            discordRole: '@Captain',
            discordLinked: true,
            order: 4,
        },
        {
            name: 'Sergeant',
            chevrons: 3,
            holders: 8,
            discordRole: '@Sergeant',
            discordLinked: true,
            order: 5,
        },
        {
            name: 'Corporal',
            chevrons: 2,
            holders: 14,
            discordRole: '@Corporal',
            discordLinked: true,
            order: 6,
        },
        {
            name: 'Private, First Class',
            chevrons: 2,
            holders: 22,
            discordRole: '@Private1C',
            discordLinked: true,
            order: 7,
        },
        {
            name: 'Private',
            chevrons: 1,
            holders: 38,
            discordRole: '@Private',
            discordLinked: true,
            order: 8,
        },
        {
            name: 'Recruit',
            chevrons: 0,
            holders: 11,
            discordRole: '@Recruit',
            discordLinked: false,
            order: 9,
        },
    ];

    medals: Medal[] = [
        {
            letter: 'D',
            ribbon: 'gold',
            title: 'Distinguished Service Cross',
            description: 'Awarded for outstanding service above and beyond the call of duty.',
            holders: 3,
            discordLinked: true,
        },
        {
            letter: 'M',
            ribbon: 'blue',
            title: 'Marksman, First Class',
            description: 'Exceptional accuracy recognised in three or more engagements.',
            holders: 7,
            discordLinked: true,
        },
        {
            letter: 'C',
            ribbon: 'red',
            title: 'Campaign Medal',
            description: 'Participation in a full regimental campaign season.',
            holders: 42,
            discordLinked: false,
        },
        {
            letter: 'F',
            ribbon: 'green',
            title: 'Faithful Service Medal',
            description: 'One year of continuous active membership.',
            holders: 19,
            discordLinked: true,
        },
        {
            letter: 'R',
            ribbon: 'tricolor',
            title: 'Regimental Cross',
            description: 'The highest honour, awarded by the Colonel personally.',
            holders: 1,
            discordLinked: true,
        },
    ];

    editingMedal: Medal = this.medals[1];
    editTitle = 'Marksman, First Class';
    editLetter = 'M';
    editDescription = 'Exceptional accuracy recognised in three or more engagements.';
    editPrecedence = 2;
    editRibbon: MedalRibbon = 'blue';

    ribbonOptions: MedalRibbon[] = ['blue', 'red', 'gold', 'green', 'tricolor'];

    selectMedalEdit(medal: Medal): void {
        this.editingMedal = medal;
        this.editTitle = medal.title;
        this.editLetter = medal.letter;
        this.editDescription = medal.description || '';
        this.editRibbon = medal.ribbon;
    }
}
