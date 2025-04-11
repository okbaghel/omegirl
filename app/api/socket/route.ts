import { Server, Socket } from 'socket.io';
import { NextResponse } from 'next/server';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import type { NextApiResponse } from 'next';

interface SocketServer extends HTTPServer {
  io?: Server;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const waitingUsers = new Set<string>();

export async function GET(req: Request) {
  try {
    // @ts-ignore
    const res = new NextResponse();
    // @ts-ignore
    const httpServer: SocketServer = res.socket.server;

    if (!httpServer.io) {
      console.log('Starting Socket.IO server...');

      httpServer.io = new Server(httpServer, {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
      });

      httpServer.io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);
        socket.on('ready', () => {
          console.log('User ready:', socket.id);
          waitingUsers.delete(socket.id);
        
          const [partnerId] = Array.from(waitingUsers);
          if (partnerId) {
            waitingUsers.delete(partnerId);
        
            console.log('Matching users:', socket.id, 'with', partnerId);
            socket.emit('matched', { partnerId });
            httpServer.io?.to(partnerId).emit('matched', { partnerId: socket.id });
          } else {
            console.log('Adding to waiting list:', socket.id);
            waitingUsers.add(socket.id);
          }
        });
        

        socket.on('offer', ({ offer, to }) => {
          console.log('Relaying offer from', socket.id, 'to', to);
          socket.to(to).emit('offer', { offer, from: socket.id });
        });

        socket.on('answer', ({ answer, to }) => {
          console.log('Relaying answer from', socket.id, 'to', to);
          socket.to(to).emit('answer', { answer, from: socket.id });
        });

        socket.on('ice-candidate', ({ candidate, to }) => {
          console.log('Relaying ICE candidate from', socket.id, 'to', to);
          socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
        });

        socket.on('next', () => {
          console.log('User requesting next:', socket.id);
          waitingUsers.delete(socket.id);

          if (waitingUsers.size > 0) {
            const [partnerId] = Array.from(waitingUsers);
            waitingUsers.delete(partnerId);

            console.log('Matching users:', socket.id, 'with', partnerId);
            socket.emit('matched', { partnerId });
            httpServer.io?.to(partnerId).emit('matched', { partnerId: socket.id });
          } else {
            console.log('Adding to waiting list:', socket.id);
            waitingUsers.add(socket.id);
          }
        });

        socket.on('disconnect', () => {
          console.log('User disconnected:', socket.id);
          waitingUsers.delete(socket.id);
        });
      });
    }

    return new NextResponse('Socket server is running');
  } catch (error) {
    console.error('Socket initialization error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
