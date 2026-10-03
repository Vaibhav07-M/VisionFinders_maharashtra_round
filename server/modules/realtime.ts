import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/firestore';
import { Drop, DropEntry, Offer, Ticket, LiveBoardData } from '../../shared/types';

export interface RealtimeBroadcaster {
  broadcastDropUpdate: (dropId: string, payload: any) => void;
  broadcastDrawResult: (dropId: string, winnersCount: number, seed: string) => void;
  broadcastBoardUpdate: (dropId: string, board: LiveBoardData) => void;
  broadcastQueueUpdate: (dropId: string, payload: { peopleWaiting: number; totalHeld: number; soonestExpiryMs: number | null }) => void;
  notifyOfferCreated: (uid: string, offer: Offer) => void;
  notifyOfferExpired: (uid: string, offer: Offer) => void;
  notifyOfferPaid: (uid: string, payload: { offer: Offer; ticket?: Ticket }) => void;
  notifyWaitlistPosition: (uid: string, payload: { position: number; totalWaitlisted: number }) => void;
}

let broadcasterInstance: RealtimeBroadcaster | null = null;

export function getRealtimeInstance(): RealtimeBroadcaster | null {
  return broadcasterInstance;
}

export function setupRealtimeServer(io: SocketIOServer): RealtimeBroadcaster {
  io.on('connection', (socket: Socket) => {
    const userUid = (socket.handshake.query.uid as string) || 'user_guest';
    const dropId = (socket.handshake.query.dropId as string) || 'drop-jack-white-vault';

    socket.join(`drop_${dropId}`);
    if (userUid && userUid !== 'user_guest') {
      socket.join(`user_${userUid}`);
    }

    // Always emit time:sync on connect and reconnect
    socket.emit('time:sync', { serverTime: Date.now() });

    // Push full current state on connect and reconnect
    const sendUserState = () => {
      const dropDoc = db.get('drops', dropId);
      const drop = dropDoc ? (dropDoc.data as Drop) : null;

      // Find user's entry
      const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
      const userEntry = entries.find(e => e.uid === userUid);

      // Find user's active or latest offer
      const offers = db.list(`drops/${dropId}/offers`).map(d => d.data as Offer);
      const userOffer = offers.find(o => o.uid === userUid && o.status === 'offered' && o.expiresAt > Date.now()) ||
        offers.find(o => o.uid === userUid) || null;

      // Compute waitlist position
      let waitlistPosition: number | null = null;
      const waitlisted = entries.filter(e => e.status === 'waitlisted').sort((a, b) => (a.drawRank || 0) - (b.drawRank || 0));
      if (userEntry && userEntry.status === 'waitlisted') {
        const idx = waitlisted.findIndex(e => e.uid === userUid);
        if (idx !== -1) waitlistPosition = idx + 1;
      }

      // Find ticket if any
      const tickets = db.list('tickets').map(d => d.data as Ticket);
      const userTicket = tickets.find(t => t.uid === userUid && t.dropId === dropId) || null;

      socket.emit('state:sync', {
        serverTime: Date.now(),
        drop,
        userEntry: userEntry || null,
        userOffer,
        waitlistPosition,
        totalWaitlisted: waitlisted.length,
        userTicket,
        reconnectedNotice: 'State successfully synchronized from server.',
      });
    };

    sendUserState();

    socket.on('request:sync', () => {
      socket.emit('time:sync', { serverTime: Date.now() });
      sendUserState();
    });

    socket.on('disconnect', () => {
      // socket disconnected
    });
  });

  broadcasterInstance = {
    broadcastDropUpdate: (dropId: string, payload: any) => {
      io.to(`drop_${dropId}`).emit('drop:update', payload);
    },
    broadcastDrawResult: (dropId: string, winnersCount: number, seed: string) => {
      io.to(`drop_${dropId}`).emit('drop:drawn', { winnersCount, seed });
    },
    broadcastBoardUpdate: (dropId: string, board: LiveBoardData) => {
      io.to(`drop_${dropId}`).emit('board:update', board);
    },
    broadcastQueueUpdate: (dropId: string, payload: { peopleWaiting: number; totalHeld: number; soonestExpiryMs: number | null }) => {
      io.to(`drop_${dropId}`).emit('queue:update', payload);
    },
    notifyOfferCreated: (uid: string, offer: Offer) => {
      io.to(`user_${uid}`).emit('offer:created', offer);
    },
    notifyOfferExpired: (uid: string, offer: Offer) => {
      io.to(`user_${uid}`).emit('offer:expired', offer);
    },
    notifyOfferPaid: (uid: string, payload: { offer: Offer; ticket?: Ticket }) => {
      io.to(`user_${uid}`).emit('offer:paid', payload);
    },
    notifyWaitlistPosition: (uid: string, payload: { position: number; totalWaitlisted: number }) => {
      io.to(`user_${uid}`).emit('waitlist:position', payload);
    },
  };

  return broadcasterInstance;
}
