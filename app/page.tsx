"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Video, VideoOff, Mic, MicOff, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import VideoCall from "@/components/VideoCall";

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Omegirl</h1>
          <p className="text-muted-foreground">Meet new people from around the world!</p>
        </div>

        {!isStarted ? (
          <Card className="p-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to start?</h2>
            <p className="text-muted-foreground mb-6">
              Click the button below to start meeting new people. Make sure your camera and microphone are working.
            </p>
            <Button 
              size="lg"
              onClick={() => setIsStarted(true)}
            >
              Start Meeting People
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <VideoCall 
              isMuted={isMuted}
              isVideoOff={isVideoOff}
            />
            
            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsVideoOff(!isVideoOff)}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>

              <Button
                variant="default"
                className="gap-2"
                onClick={() => {
                  const videoCallComponent = document.querySelector('video-call');
                  if (videoCallComponent) {
                    (videoCallComponent as any).handleNext();
                  }
                }}
              >
                <SkipForward className="h-5 w-5" />
                Next Person
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}