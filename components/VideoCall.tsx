"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { WebRTCConnection } from "@/lib/webrtc";
import { io, Socket } from "socket.io-client";

interface VideoCallProps {
  isMuted: boolean;
  isVideoOff: boolean;
}

export default function VideoCall({ isMuted, isVideoOff }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rtcConnection, setRtcConnection] = useState<WebRTCConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const initializeWebRTC = async (stream: MediaStream) => {
    const connection = new WebRTCConnection();
    await connection.setLocalStream(stream);
    setRtcConnection(connection);

    connection.onTrack((remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        setIsConnecting(false);
      }
    });

    return connection;
  };

  useEffect(() => {
    const newSocket = io({
      path: '/api/socket',
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream;

    const initializeMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const connection = await initializeWebRTC(stream);
        setRtcConnection(connection);

        if (socket) {
          socket.emit('ready');
        }

      } catch (error) {
        console.error("Error accessing media devices:", error);
      }
    };

    if (socket) {
      initializeMedia();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (rtcConnection) {
        rtcConnection.close();
      }
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !rtcConnection) return;

    socket.on('matched', async ({ partnerId }) => {
      try {
        setIsConnecting(false);
        const offer = await rtcConnection.createOffer();
        socket.emit('offer', { offer, to: partnerId });
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    });

    socket.on('offer', async ({ offer, from }) => {
      try {
        const answer = await rtcConnection.createAnswer(offer);
        socket.emit('answer', { answer, to: from });
      } catch (error) {
        console.error('Error creating answer:', error);
      }
    });

    socket.on('answer', async ({ answer }) => {
      try {
        await rtcConnection.setRemoteAnswer(answer);
      } catch (error) {
        console.error('Error setting remote answer:', error);
      }
    });

    socket.on('ice-candidate', ({ candidate }) => {
      rtcConnection.addIceCandidate(candidate);
    });

    rtcConnection.onIceCandidate((candidate) => {
      socket.emit('ice-candidate', { candidate });
    });

    return () => {
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, rtcConnection]);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOff;
      }
    }
  }, [isVideoOff, localStream]);

  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
      }
    }
  }, [isMuted, localStream]);

  const handleNext = async () => {
    setIsConnecting(true);
    
    // Close existing connection
    if (rtcConnection) {
      rtcConnection.close();
    }

    // Clear remote video
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Create new WebRTC connection
    if (localStream) {
      const newConnection = await initializeWebRTC(localStream);
      setRtcConnection(newConnection);
    }

    // Emit next event to server
    if (socket) {
      socket.emit('next');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="aspect-video relative overflow-hidden">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
          You
        </div>
      </Card>

      <Card className="aspect-video relative overflow-hidden">
        {isConnecting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Finding someone to chat with...</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
              Stranger
            </div>
          </>
        )}
      </Card>
    </div>
  );
}