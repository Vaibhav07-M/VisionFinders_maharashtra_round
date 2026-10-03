import { UserRole } from '@shared/types';

export interface DemoPersona {
  key: 'attendee' | 'organizer' | 'security' | 'evaluator';
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  badge: string;
  badgeVariant: 'yellow' | 'emerald' | 'cyan' | 'rose' | 'amber';
  portalName: 'Attendee Portal' | 'Organizer Portal' | 'Security Operations' | 'Adversarial Lab';
  defaultRoute: string;
  description: string;
}

export const DEMO_PERSONAS: Record<'attendee' | 'organizer' | 'security' | 'evaluator', DemoPersona> = {
  attendee: {
    key: 'attendee',
    displayName: 'Alex Chen',
    email: 'alex.chen@fairdrop.io',
    phone: '+1 (555) 382-9901',
    role: 'attendee',
    badge: 'Verified Attendee',
    badgeVariant: 'emerald',
    portalName: 'Attendee Portal',
    defaultRoute: '/',
    description: 'Enters drops, solves client PoW, receives idempotent receipts, checks out held seats.',
  },
  organizer: {
    key: 'organizer',
    displayName: 'Elena Rostova',
    email: 'elena@thirdmanrecords.com',
    phone: '+1 (555) 890-1234',
    role: 'organizer',
    badge: 'Event Producer / Host',
    badgeVariant: 'yellow',
    portalName: 'Organizer Portal',
    defaultRoute: '/admin',
    description: 'Creates drops, sets Fair Drop vs FCFS mode, audits 500-seat auditorium grid, reveals seeds.',
  },
  security: {
    key: 'security',
    displayName: 'Marcus Vance',
    email: 'security@fairdrop.io',
    phone: '+1 (555) 432-8765',
    role: 'security',
    badge: 'Fraud & Abuse Lead',
    badgeVariant: 'amber',
    portalName: 'Security Operations',
    defaultRoute: '/admin/live',
    description: 'Monitors real-time RPS radar, tunes rate limit thresholds & PoW difficulty, reviews appeals.',
  },
  evaluator: {
    key: 'evaluator',
    displayName: 'Dr. Aris Thorne',
    email: 'evaluator@fairnesslab.org',
    phone: '+1 (555) 765-4321',
    role: 'security',
    badge: 'Lead Research Scientist',
    badgeVariant: 'cyan',
    portalName: 'Adversarial Lab',
    defaultRoute: '/lab/attack-designer',
    description: 'Executes 50,000-virtual-client stress tests, injects chaos failures, evaluates Jain index & Gini.',
  },
};
