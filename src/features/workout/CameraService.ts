export type CameraState = 
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'PERMISSION_GRANTED'
  | 'INITIALIZING_CAMERA'
  | 'STREAM_READY'
  | 'VIDEO_ATTACHING'
  | 'VIDEO_LOADING'
  | 'VIDEO_PLAYING'
  | 'VIDEO_READY'
  | 'ERROR'
  | 'STOPPED';

export interface CameraError {
  name: string;
  message: string;
  originalError?: any;
}

export class CameraService {
  private static instance: CameraService;
  
  private currentSessionId: string | null = null;
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private state: CameraState = 'IDLE';
  
  private onStateChange: ((state: CameraState, error?: CameraError) => void) | null = null;

  private constructor() {}

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  public setOnStateChange(callback: (state: CameraState, error?: CameraError) => void) {
    this.onStateChange = callback;
  }

  private updateState(newState: CameraState, error?: CameraError) {
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(newState, error);
    }
  }

  public getState(): CameraState {
    return this.state;
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async start(video: HTMLVideoElement): Promise<void> {
    const sessionId = `cam_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
    this.currentSessionId = sessionId;
    
    this.stop(); // Clean any existing state, though we are about to start a new session
    this.currentSessionId = sessionId; // Re-set because stop() clears it
    this.videoElement = video;
    
    try {
      this.updateState('REQUESTING_PERMISSION');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw { name: 'NotSupportedError', message: 'Your current browser/environment does not provide camera access.' };
      }

      // Fallback strategy
      let mediaStream: MediaStream | null = null;
      
      const constraintsAttempts = [
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false }
      ];

      let lastErr: any = null;
      for (const constraints of constraintsAttempts) {
        if (this.currentSessionId !== sessionId) return; // Session aborted
        
        try {
          // Timeout wrapper for getUserMedia
          mediaStream = await Promise.race([
            navigator.mediaDevices.getUserMedia(constraints),
            new Promise<MediaStream>((_, reject) => 
              setTimeout(() => reject({ name: 'TimeoutError', message: 'Camera permission request timed out.' }), 10000)
            )
          ]);
          break; // Success!
        } catch (err: any) {
          lastErr = err;
          // If permission is outright denied, don't keep trying fallbacks
          if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
            break;
          }
        }
      }

      if (!mediaStream) {
        throw lastErr || new Error("All camera attempts failed.");
      }

      if (this.currentSessionId !== sessionId) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      this.stream = mediaStream;
      this.updateState('PERMISSION_GRANTED');
      this.updateState('INITIALIZING_CAMERA');

      // Validate tracks
      const tracks = this.stream.getVideoTracks();
      if (tracks.length === 0) {
        throw { name: 'NoVideoTrackError', message: 'No video track found in the camera stream.' };
      }
      
      const track = tracks[0];
      if (track.readyState !== 'live' || !track.enabled) {
        throw { name: 'NotReadableError', message: 'Camera track is not live. It may be in use by another application.' };
      }

      this.updateState('STREAM_READY');
      this.updateState('VIDEO_ATTACHING');

      video.srcObject = this.stream;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;

      this.updateState('VIDEO_LOADING');

      // Attempt play
      try {
        await Promise.race([
          video.play(),
          new Promise((_, reject) => setTimeout(() => reject({ name: 'PlayTimeout', message: 'Video failed to start playing.' }), 5000))
        ]);
      } catch (playErr: any) {
        throw { name: 'PlayError', message: 'Could not play camera video: ' + (playErr.message || playErr.name), originalError: playErr };
      }
      
      if (this.currentSessionId !== sessionId) return;
      this.updateState('VIDEO_PLAYING');

      // Wait for Readiness
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const checkReady = () => {
          if (this.currentSessionId !== sessionId) {
            resolve(); // Aborted safely
            return;
          }
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            resolve();
          } else {
            attempts++;
            if (attempts > 50) { // 5 seconds (50 * 100ms)
              reject({ name: 'TimeoutError', message: 'Video dimensions did not load in time.' });
            } else {
              setTimeout(checkReady, 100);
            }
          }
        };
        setTimeout(checkReady, 100);
      });

      if (this.currentSessionId !== sessionId) return;

      this.updateState('VIDEO_READY');

    } catch (err: any) {
      if (this.currentSessionId !== sessionId) return;
      this.stop(); // Clean up partial state
      
      let humanMsg = 'Camera could not be initialized. Please try again.';
      if (err.name === 'NotAllowedError') humanMsg = 'Camera permission was denied. Allow camera access and try again.';
      else if (err.name === 'NotFoundError') humanMsg = 'No camera was detected.';
      else if (err.name === 'NotReadableError') humanMsg = 'The camera is currently being used by another application.';
      else if (err.name === 'SecurityError') humanMsg = 'Camera access is blocked by the current security settings.';
      else if (err.name === 'TimeoutError') humanMsg = err.message;
      else if (err.name === 'NotSupportedError') humanMsg = err.message;

      this.updateState('ERROR', { name: err.name || 'UnknownError', message: humanMsg, originalError: err });
    }
  }

  public stop(): void {
    this.currentSessionId = null; // Invalidate any running async operations
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    
    if (this.state !== 'IDLE' && this.state !== 'STOPPED' && this.state !== 'ERROR') {
      this.updateState('STOPPED');
    }
  }
}

export const cameraService = CameraService.getInstance();
