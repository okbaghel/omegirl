export class WebRTCConnection {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private onTrackCallback: ((stream: MediaStream) => void) | null = null;

  constructor() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { 
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
            'stun:stun3.l.google.com:19302',
            'stun:stun4.l.google.com:19302'
          ]
        }
      ],
      iceCandidatePoolSize: 10
    });

    this.peerConnection.ontrack = (event) => {
      if (this.onTrackCallback) {
        this.onTrackCallback(event.streams[0]);
      }
    };

    // Log connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
    };

    // Log ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.peerConnection.iceConnectionState);
    };
  }

  async setLocalStream(stream: MediaStream) {
    this.localStream = stream;
    stream.getTracks().forEach((track) => {
      if (this.localStream) {
        this.peerConnection.addTrack(track, this.localStream);
      }
    });
  }

  onTrack(callback: (stream: MediaStream) => void) {
    this.onTrackCallback = callback;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection.signalingState !== "stable") {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  onIceCandidate(callback: (candidate: RTCIceCandidate) => void) {
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        callback(event.candidate);
      }
    };
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  close() {
    this.peerConnection.close();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}