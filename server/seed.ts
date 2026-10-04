import { db, sha256Sync } from './db/firestore';
import { hashPassword } from './modules/auth';
import { INITIAL_SAMPLE_DROPS, DEFAULT_DEFENCE_CONFIG } from '../shared/constants';
import { Seat, Drop, Appeal, AuditRecord } from '../shared/types';
import { DEFAULT_SECURITY_CONFIG } from './modules/abuse';
import { appendAuditRecord } from './modules/audit';
import { ensureActiveWindow } from './modules/drops';

export function runSeed() {
  console.log('[SEED] Starting Fair Drop database seeding...');

  // 1. Seed Real Users / Personas
  const personas = [
    {
      uid: 'user_alex_77',
      email: 'alex.chen@fairdrop.io',
      displayName: 'Alex Chen',
      role: 'attendee',
      phone: '+1 (555) 382-9901',
      phoneVerified: true,
      passwordHash: hashPassword('Alex123!'),
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'user_marcus_organizer',
      email: 'marcus.v@festivalgroup.com',
      displayName: 'Marcus Vance',
      role: 'organizer',
      phone: '+1 (555) 441-2099',
      phoneVerified: true,
      passwordHash: hashPassword('Marcus123!'),
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'user_dr_elena_sec',
      email: 'elena.rostova@fairdrop.io',
      displayName: 'Dr. Elena Rostova',
      role: 'security',
      phone: '+1 (555) 890-1122',
      phoneVerified: true,
      passwordHash: hashPassword('Elena123!'),
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'user_prof_arun_eval',
      email: 'arun.patel@securitybench.org',
      displayName: 'Prof. Arun Patel',
      role: 'evaluator',
      phone: '+1 (555) 773-4500',
      phoneVerified: true,
      passwordHash: hashPassword('Arun123!'),
      createdAt: new Date().toISOString(),
    },
  ];

  for (const user of personas) {
    db.set('users', user.uid, user);
    // Create initial session for quick auth
    const sessionId = `sess_${user.uid}`;
    db.set('sessions', sessionId, {
      sessionId,
      uid: user.uid,
      deviceId: 'seed_device',
      ipHash: sha256Sync('127.0.0.1'),
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    });
  }
  console.log(`[SEED] Seeded ${personas.length} personas into 'users' and 'sessions' collections.`);

  // 2. Seed Verified Phone Identity for Attendee
  const alexPhone = '+1 (555) 382-9901';
  const alexPhoneHash = sha256Sync(alexPhone.replace(/[^\d+]/g, ''));
  db.set('identities', alexPhoneHash, {
    uid: 'user_alex_77',
    verifiedPhoneHash: alexPhoneHash,
    phoneMasked: '+1 (555) •••-9901',
    verifiedAt: Date.now(),
  });
  console.log(`[SEED] Seeded verified identity for attendee Alex Chen.`);

  // 3. Seed Drops & 500 Individual Seats
  for (const drop of INITIAL_SAMPLE_DROPS) {
    const activeDrop = ensureActiveWindow({ ...drop });
    db.set('drops', activeDrop.id, activeDrop);
    // Generate private seed record for verifiable commit-reveal
    const secretSeed = `SEED_DEV_${drop.id}_KEY_2026`;
    const seedCommitHash = sha256Sync(secretSeed);
    db.set('private_seeds', drop.id, { secretSeed, seedCommitHash });

    // Seed 500 individual seats for the main drop
    const sections = ['Orchestra A', 'Orchestra B', 'Mezzanine Center', 'Balcony Front'];
    const seatBatchOps: Array<any> = [];

    for (let i = 1; i <= drop.seatCount; i++) {
      const section = sections[Math.floor((i - 1) / (drop.seatCount / 4))];
      const row = String.fromCharCode(65 + Math.floor(((i - 1) % 125) / 25));
      const seatNum = ((i - 1) % 25) + 1;
      const seatId = `seat-${i}`;
      const tierId = i <= 20 ? 'vip' : i <= 80 ? 'platinum' : i <= 180 ? 'gold' : i <= 330 ? 'silver' : 'bronze';
      const seat: Seat = {
        id: seatId,
        dropId: drop.id,
        tierId,
        section,
        row,
        number: seatNum,
        label: `${section} · Row ${row}-${seatNum}`,
        price: drop.price,
        accessible: i % 25 === 1,
        status: i > 485 ? 'sold' : 'available',
      };
      seatBatchOps.push({
        type: 'set',
        collection: `drops/${drop.id}/seats`,
        docId: seatId,
        data: seat,
      });
    }

    for (let b = 0; b < seatBatchOps.length; b += 450) {
      db.batchWrite(seatBatchOps.slice(b, b + 450));
    }
  }
  console.log(`[SEED] Seeded drops and 500 individual seats in Firestore.`);

  // 4. Seed Global Security Configuration
  db.set('securityConfig', 'global', DEFAULT_SECURITY_CONFIG);
  console.log(`[SEED] Seeded securityConfig/global.`);

  // 5. Seed Initial Appeal
  const sampleAppeal: Appeal = {
    id: 'appeal-01',
    entryId: 'RCP-FLAGS-99',
    dropId: 'drop-jack-white-vault',
    dropName: 'Jack White: The Twilight Echoes Vault Edition',
    userEmail: 'sarah.m@gmail.com',
    reason: 'I submitted my entry from a university shared WiFi network. I am a genuine student fan, not a bot.',
    status: 'pending',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  };
  db.set('appeals', sampleAppeal.id, sampleAppeal);
  console.log(`[SEED] Seeded initial appeal in 'appeals'.`);

  // 6. Seed Genesis Audit Log Block
  appendAuditRecord('SYSTEM_GENESIS_SEED_COMMITTED', 'system', {
    dropId: 'drop-jack-white-vault',
    seedCommitHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    mode: 'FAIR_DROP',
  });
  console.log(`[SEED] Seeded genesis audit log record.`);

  console.log('[SEED] Database seeding completed successfully.');
}

// Auto-run if executed directly via tsx
if (import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  runSeed();
}
