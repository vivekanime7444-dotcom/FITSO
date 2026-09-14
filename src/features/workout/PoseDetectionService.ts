import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export class PoseDetectionService {
  private static instance: PoseDetectionService;
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private cameraStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private drawingUtils: DrawingUtils | null = null;
  private activeRequestAnimationFrame: number | null = null;
  
  // Callback when a new pose is detected
  public onPoseDetected: ((result: any, videoWidth: number, videoHeight: number) => void) | null = null;

  private constructor() {}

  public static getInstance(): PoseDetectionService {
    if (!PoseDetectionService.instance) {
      PoseDetectionService.instance = new PoseDetectionService();
    }
    return PoseDetectionService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isInitialized = true;
      console.log("PoseLandmarker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize PoseLandmarker", error);
    } finally {
      this.isInitializing = false;
    }
  }

  public async startCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.videoElement = video;
    this.canvasElement = canvas;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      this.drawingUtils = new DrawingUtils(ctx);
    }

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 }
      });
      video.srcObject = this.cameraStream;
      video.addEventListener("loadeddata", this.predictWebcam);
      video.play();
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      throw err;
    }
  }

  public stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    if (this.videoElement) {
      this.videoElement.removeEventListener("loadeddata", this.predictWebcam);
      this.videoElement.srcObject = null;
    }
    if (this.activeRequestAnimationFrame !== null) {
      cancelAnimationFrame(this.activeRequestAnimationFrame);
      this.activeRequestAnimationFrame = null;
    }
  }

  private predictWebcam = async () => {
    if (!this.videoElement || !this.poseLandmarker || !this.canvasElement) return;

    let lastVideoTime = -1;
    let lastAnalysisTime = 0;
    
    const detect = async () => {
      if (!this.videoElement || !this.poseLandmarker || !this.canvasElement) return;

      const now = performance.now();
      // Throttle analysis to ~30 FPS (33ms) to prevent blocking main thread too much
      if (now - lastAnalysisTime >= 33 && this.videoElement.currentTime !== lastVideoTime) {
        lastAnalysisTime = now;
        lastVideoTime = this.videoElement.currentTime;
        
        try {
          const results = this.poseLandmarker.detectForVideo(this.videoElement, performance.now());
          
          const ctx = this.canvasElement.getContext("2d");
          if (ctx && this.drawingUtils) {
            ctx.save();
            ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            if (results.landmarks && results.landmarks.length > 0) {
              for (const landmark of results.landmarks) {
                this.drawingUtils.drawLandmarks(landmark, {
                  radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
                  color: "#00F0FF",
                  lineWidth: 2
                });
                this.drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS, {
                  color: "#0088FF",
                  lineWidth: 3
                });
              }
            }
            ctx.restore();
          }

          if (this.onPoseDetected && results.landmarks && results.landmarks.length > 0) {
            this.onPoseDetected(results, this.videoElement.videoWidth, this.videoElement.videoHeight);
          } else if (this.onPoseDetected) {
            // Send null so the analysis engine knows tracking is lost
            this.onPoseDetected(null, this.videoElement.videoWidth, this.videoElement.videoHeight);
          }
        } catch(e) {
          console.error("Detection error", e);
        }
      }

      this.activeRequestAnimationFrame = requestAnimationFrame(detect);
    };

    detect();
  };

  public isReady(): boolean {
    return this.isInitialized;
  }
}

export const poseDetectionService = PoseDetectionService.getInstance();
