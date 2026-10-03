import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/firestore';
import { Drop, DropEntry, Reservation } from '../../shared/types';

export function setupRealtimeServer(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    const userUid = (socket.handshake.query.uid as string) || 'user_guest';
    const dropId = (socket.handshake.query.dropId as string) || 'drop-jack-white-vault';

    socket.join(`drop_${dropId}`);

    // Section 5 Requirement 9: On connect AND reconnect, push FULL current state for that user
    const sendUserState = () => {
      const dropDoc = db.get('drops', dropId);
      const drop = dropDoc ? dropDoc.data as Drop : null;

      // Find user's entry
      const entries = db.list(`drops/${dropId}/entries`).map(d => d.data as DropEntry);
      const userEntry = entries.find(e => e.uid === userUid);

      // Find active reservation
      const reservations = db.list(`drops/${dropId}/reservations`).map(d => d.data as Reservation);
      const userRes = reservations.find(r => r.uid === userUid && r.status === 'active');

      socket.emit('state:sync', {
        serverTime: Date.now(),
        drop,
        userEntry: userEntry || null,
        userReservation: userRes || null,
        reconnectedNotice: 'State successfully synchronized from server.',
      });
    };

    sendUserState();

    socket.on('request:sync', () => {
      sendUserState();
    });

    socket.on('disconnect', () => {
      // Room cleanup
    });
  });

  // Global broadcast helper
  return {
    broadcastDropUpdate: (dropId: string, payload: any) => {
      io.to(`drop_${dropId}`).emit('drop:update', payload);
    },
    broadcastDrawResult: (dropId: string, winnersCount: number, seed: string) => {
      io.to(`drop_${dropId}`).emit('drop:drawn', { winnersCount, seed });
    },
  };
}
