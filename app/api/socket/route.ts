
export const dynamic = "force-dynamic";

import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import { NextApiRequest } from 'next';
import { Server as IOServer, Socket } from 'socket.io';
import type { NextApiResponse } from 'next';

interface SocketServer extends NetServer {
  io?: IOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const waitingUsers = new Set<string>();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    console.log('🔌 Starting Socket.IO server...');

    const io = new IOServer(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    res.socket.server.io = io;

    io.on('connection', (socket: Socket) => {
      console.log('👤 User connected:', socket.id);

      socket.on('ready', () => {
        console.log('✅ User ready:', socket.id);
        waitingUsers.delete(socket.id);

        const [partnerId] = Array.from(waitingUsers);
        if (partnerId) {
          waitingUsers.delete(partnerId);
          socket.emit('matched', { partnerId });
          io.to(partnerId).emit('matched', { partnerId: socket.id });
        } else {
          waitingUsers.add(socket.id);
        }
      });

      socket.on('offer', ({ offer, to }) => {
        socket.to(to).emit('offer', { offer, from: socket.id });
      });

      socket.on('answer', ({ answer, to }) => {
        socket.to(to).emit('answer', { answer, from: socket.id });
      });

      socket.on('ice-candidate', ({ candidate, to }) => {
        socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
      });

      socket.on('next', () => {
        waitingUsers.delete(socket.id);
        const [partnerId] = Array.from(waitingUsers);
        if (partnerId) {
          waitingUsers.delete(partnerId);
          socket.emit('matched', { partnerId });
          io.to(partnerId).emit('matched', { partnerId: socket.id });
        } else {
          waitingUsers.add(socket.id);
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
        waitingUsers.delete(socket.id);
      });
    });
  }

  res.end();
}
