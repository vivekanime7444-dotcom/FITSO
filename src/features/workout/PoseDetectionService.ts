import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { SkeletonVisualizationMapper } from './SkeletonVisualizationMapper';

export class PoseDetectionService {
  private static instance: PoseDetectionService;
  private poseLandmarker: PoseLandmarker | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private cameraStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private activeRequestAnimationFrame: number | null = null;
  private visualMapper = new SkeletonVisualizationMapper();
  
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
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
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
        this.initPromise = null; // Allow retry on failure
        throw error;
      }
    })();

    return this.initPromise;
  }

  public async startCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.stopCamera(); // Ensure clean state before starting

    this.videoElement = video;
    this.canvasElement = canvas;

    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480, frameRate: { ideal: 30 } }
      });
      
      // If stopCamera was called while waiting for permission, abort safely
      if (!this.videoElement) {
        this.cameraStream.getTracks().forEach(t => t.stop());
        this.cameraStream = null;
        return;
      }

      video.srcObject = this.cameraStream;
      // Prevent multiple listeners
      video.removeEventListener("loadeddata", this.predictWebcam);
      video.addEventListener("loadeddata", this.predictWebcam);
      await video.play();
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
      this.videoElement = null;
    }
    if (this.canvasElement) {
       const ctx = this.canvasElement.getContext("2d");
       if (ctx) ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
       this.canvasElement = null;
    }
    if (this.activeRequestAnimationFrame !== null) {
      cancelAnimationFrame(this.activeRequestAnimationFrame);
      this.activeRequestAnimationFrame = null;
    }
  }

  private predictWebcam = async () => {
    if (this.activeRequestAnimationFrame !== null) return; // Prevent multiple loops

    let lastVideoTime = -1;
    let lastAnalysisTime = 0;
    
    const detect = async () => {
      // If stopped or not ready, exit loop cleanly
      if (!this.videoElement || !this.poseLandmarker || !this.canvasElement) {
        this.activeRequestAnimationFrame = null;
        return;
      }

      const now = performance.now();
      // Throttle analysis to ~30 FPS (33ms) to prevent blocking main thread too much
      if (now - lastAnalysisTime >= 33 && this.videoElement.currentTime !== lastVideoTime) {
        lastAnalysisTime = now;
        lastVideoTime = this.videoElement.currentTime;
        
        try {
          const results = this.poseLandmarker.detectForVideo(this.videoElement, performance.now());
          
          const ctx = this.canvasElement.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
            
            if (results.landmarks && results.landmarks.length > 0) {
                // Get the simple skeleton data
                const simpleSkeleton = this.visualMapper.map(results.landmarks[0]);
                if (simpleSkeleton) {
                    const width = this.canvasElement.width;
                    const height = this.canvasElement.height;

                    const drawPoint = (point: any) => {
                      if (!point || point.visibility < 0.4) return;
                      ctx.beginPath();
                      ctx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
                      ctx.fillStyle = 'rgba(0, 255, 255, 0.9)';
                      ctx.fill();
                      // Optional glow
                      ctx.shadowBlur = 10;
                      ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
                      ctx.fill();
                      ctx.shadowBlur = 0; // reset
                    };

                    const drawLine = (p1: any, p2: any) => {
                      if (!p1 || !p2 || p1.visibility < 0.4 || p2.visibility < 0.4) return;
                      ctx.beginPath();
                      ctx.moveTo(p1.x * width, p1.y * height);
                      ctx.lineTo(p2.x * width, p2.y * height);
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                      ctx.lineWidth = 2;
                      ctx.stroke();
                    };

                    // Draw connections
                    drawLine(simpleSkeleton.head, simpleSkeleton.neck);
                    
                    drawLine(simpleSkeleton.neck, simpleSkeleton.leftShoulder);
                    drawLine(simpleSkeleton.neck, simpleSkeleton.rightShoulder);
                    
                    drawLine(simpleSkeleton.leftShoulder, simpleSkeleton.leftElbow);
                    drawLine(simpleSkeleton.leftElbow, simpleSkeleton.leftWrist);
                    
                    drawLine(simpleSkeleton.rightShoulder, simpleSkeleton.rightElbow);
                    drawLine(simpleSkeleton.rightElbow, simpleSkeleton.rightWrist);
                    
                    drawLine(simpleSkeleton.neck, simpleSkeleton.torso);
                    drawLine(simpleSkeleton.torso, simpleSkeleton.waist);
                    
                    drawLine(simpleSkeleton.waist, simpleSkeleton.leftHip);
                    drawLine(simpleSkeleton.waist, simpleSkeleton.rightHip);
                    
                    drawLine(simpleSkeleton.leftHip, simpleSkeleton.leftKnee);
                    drawLine(simpleSkeleton.leftKnee, simpleSkeleton.leftAnkle);
                    drawLine(simpleSkeleton.leftAnkle, simpleSkeleton.leftFoot);
                    
                    drawLine(simpleSkeleton.rightHip, simpleSkeleton.rightKnee);
                    drawLine(simpleSkeleton.rightKnee, simpleSkeleton.rightAnkle);
                    drawLine(simpleSkeleton.rightAnkle, simpleSkeleton.rightFoot);

                    // Draw points on top of lines
                    const points = [
                      simpleSkeleton.head, simpleSkeleton.neck,
                      simpleSkeleton.leftShoulder, simpleSkeleton.rightShoulder,
                      simpleSkeleton.leftElbow, simpleSkeleton.rightElbow,
                      simpleSkeleton.leftWrist, simpleSkeleton.rightWrist,
                      simpleSkeleton.torso, simpleSkeleton.waist,
                      simpleSkeleton.leftHip, simpleSkeleton.rightHip,
                      simpleSkeleton.leftKnee, simpleSkeleton.rightKnee,
                      simpleSkeleton.leftAnkle, simpleSkeleton.rightAnkle,
                      simpleSkeleton.leftFoot, simpleSkeleton.rightFoot
                    ];
                    
                    points.forEach(p => drawPoint(p));
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
