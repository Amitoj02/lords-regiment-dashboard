import { Component, OnInit } from '@angular/core';

interface BotOperation {
  id: string;
  timestamp: string;
  success: boolean;
  description: string;
  needsResolve: boolean;
}

interface PermissionCheck {
  permission: string;
  granted: boolean;
}

@Component({
  selector: 'app-bot-status',
  templateUrl: './bot-status.component.html',
  styleUrls: ['./bot-status.component.scss'],
  standalone: false,
})
export class BotStatusComponent implements OnInit {
  crumbs = ['Settings', 'Quartermaster bot'];

  operations: BotOperation[] = [
    { id: 'op1', timestamp: '12:04', success: true, description: 'Role sync completed — 84 members updated', needsResolve: false },
    { id: 'op2', timestamp: '11:52', success: true, description: 'Event reminder dispatched — Grand Autumn Campaign', needsResolve: false },
    { id: 'op3', timestamp: '11:30', success: false, description: 'Role assign failed — Bjorn Trager account not linked', needsResolve: true },
    { id: 'op4', timestamp: '10:15', success: true, description: 'Application notification sent — Mara Erskine', needsResolve: false },
    { id: 'op5', timestamp: '09:42', success: true, description: 'Rank promotion synced — Corporal promotion broadcast', needsResolve: false },
    { id: 'op6', timestamp: '09:01', success: false, description: 'Heartbeat missed — reconnected after 8 seconds', needsResolve: false },
    { id: 'op7', timestamp: 'Yesterday', success: true, description: 'Daily roster verification — 0 discrepancies found', needsResolve: false },
  ];

  permissionChecks: PermissionCheck[] = [
    { permission: 'Manage Roles', granted: true },
    { permission: 'Send Messages', granted: true },
    { permission: 'Embed Links', granted: true },
    { permission: 'Manage Nicknames', granted: false },
    { permission: 'View Audit Log', granted: true },
    { permission: 'Mention Everyone', granted: false },
  ];

  botInfo = {
    version: '2.4.1',
    serverName: 'Lords Regiment HQ',
    serverId: '1084739201847362',
    rolePosition: 4,
    lastHeartbeat: '12:04:02',
    totalRoles: 9,
    membersVisible: 84,
  };

  constructor() {}

  ngOnInit(): void {}

  resolve(id: string): void {
    const op = this.operations.find(o => o.id === id);
    if (op) op.needsResolve = false;
  }
}
