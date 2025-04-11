import { Server } from 'socket.io';
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
    const httpServer = res.socket.server;

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

      httpServer.io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('ready', () => {
          console.log('User ready:', socket.id);
          // Remove from any existing waiting list first
          waitingUsers.delete(socket.id);
          
          if (waitingUsers.size > 0) {
            const [partnerId] = waitingUsers;
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
          // Remove from waiting list if they were waiting
          waitingUsers.delete(socket.id);
          
          if (waitingUsers.size > 0) {
            const [partnerId] = waitingUsers;
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