import { Component } from '@angular/core';

interface NavItem {
    id: string;
    label: string;
    group: string;
}

interface ToggleSetting {
    id: string;
    label: string;
    hint: string;
    value: boolean;
}

interface PermissionRow {
    capability: string;
    owner: boolean;
    admin: boolean;
    moderator: boolean;
    member: boolean;
    mercenary: boolean;
    applicant: boolean;
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
    standalone: false,
})
export class SettingsComponent {
    activeSection = 'profile';

    regimentName = 'The Lords Regiment';
    shortTag = 'LR';
    missionStatement =
        'A disciplined line infantry regiment competing in organised Holdfast: Nations at War events since 2022.';

    navItems: NavItem[] = [
        { id: 'profile', label: 'Profile', group: 'Regiment' },
        { id: 'discord', label: 'Discord connection', group: 'Regiment' },
        { id: 'bot', label: 'Quartermaster bot', group: 'Regiment' },
        { id: 'roles', label: 'Roles & permissions', group: 'Regiment' },
        { id: 'gallery', label: 'Gallery limits', group: 'Operations' },
        { id: 'event-defaults', label: 'Event defaults', group: 'Operations' },
        { id: 'hf-server', label: 'Holdfast server', group: 'Operations' },
        { id: 'backups', label: 'Backups & exports', group: 'Operations' },
        { id: 'gdpr', label: 'Privacy & data', group: 'Compliance' },
        { id: 'transfer-discord', label: 'Transfer Discord server', group: 'Compliance' },
        { id: 'transfer-ownership', label: 'Transfer ownership', group: 'Compliance' },
    ];

    navGroups = ['Regiment', 'Operations', 'Compliance'];

    getNavByGroup(group: string): NavItem[] {
        return this.navItems.filter((n) => n.group === group);
    }

    visibilityToggles: ToggleSetting[] = [
        {
            id: 'roster',
            label: 'Public roster',
            hint: 'Show member list to non-members',
            value: true,
        },
        {
            id: 'gallery',
            label: 'Public gallery',
            hint: 'Show gallery to non-members',
            value: true,
        },
        {
            id: 'events',
            label: 'Public events',
            hint: 'Show upcoming events publicly',
            value: false,
        },
        {
            id: 'stats',
            label: 'Regiment statistics',
            hint: 'Show event attendance stats publicly',
            value: false,
        },
        {
            id: 'recruitment',
            label: 'Open recruitment',
            hint: 'Accept new applications',
            value: true,
        },
    ];

    permissionMatrix: PermissionRow[] = [
        {
            capability: 'View roster',
            owner: true,
            admin: true,
            moderator: true,
            member: true,
            mercenary: true,
            applicant: false,
        },
        {
            capability: 'Apply to join',
            owner: false,
            admin: false,
            moderator: false,
            member: false,
            mercenary: false,
            applicant: true,
        },
        {
            capability: 'RSVP to events',
            owner: true,
            admin: true,
            moderator: true,
            member: true,
            mercenary: true,
            applicant: false,
        },
        {
            capability: 'Submit to gallery',
            owner: true,
            admin: true,
            moderator: true,
            member: true,
            mercenary: true,
            applicant: false,
        },
        {
            capability: 'View audit log',
            owner: true,
            admin: true,
            moderator: false,
            member: false,
            mercenary: false,
            applicant: false,
        },
        {
            capability: 'Manage applications',
            owner: true,
            admin: true,
            moderator: true,
            member: false,
            mercenary: false,
            applicant: false,
        },
        {
            capability: 'Create events',
            owner: true,
            admin: true,
            moderator: true,
            member: false,
            mercenary: false,
            applicant: false,
        },
        {
            capability: 'Moderate gallery',
            owner: true,
            admin: true,
            moderator: true,
            member: false,
            mercenary: false,
            applicant: false,
        },
        {
            capability: 'Edit ranks & medals',
            owner: true,
            admin: true,
            moderator: false,
            member: false,
            mercenary: false,
            applicant: false,
        },
        {
            capability: 'Manage settings',
            owner: true,
            admin: false,
            moderator: false,
            member: false,
            mercenary: false,
            applicant: false,
        },
    ];

    roleColumns = ['owner', 'admin', 'moderator', 'member', 'mercenary', 'applicant'] as const;

    save(): void {
        // TODO: persist settings once the backend is wired up.
    }

    discard(): void {
        // TODO: reset settings to last-saved state once the backend is wired up.
    }
}
