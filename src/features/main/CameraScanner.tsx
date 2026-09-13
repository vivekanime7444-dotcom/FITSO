import React, { useRef, useState, useEffect } from 'react';
import { NutritionService } from '../workout/NutritionService';
import { X, Camera as CameraIcon, Loader2 } from 'lucide-react';
import { HapticService } from '../workout/HapticService';

interface CameraScannerProps {
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [phase, setPhase] = useState<'IDLE' | 'ANALYZING' | 'IDENTIFYING' | 'ESTIMATING' | 'LOGGED'>('IDLE');
  
  useEffect(() => {
    // Start camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.error("Camera access denied or unavailable", err);
        alert("Camera access is required for food scanning.");
        onClose();
      });
      
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    HapticService.selection();
    setPhase('ANALYZING');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Draw current frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Compress image to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.7);

    // UX Simulation Sequence
    setTimeout(() => {
      HapticService.light();
      setPhase('IDENTIFYING');
    }, 1000);
    
    setTimeout(() => {
      HapticService.light();
      setPhase('ESTIMATING');
    }, 2000);

    try {
      const meal = await NutritionService.analyzeFoodImage(base64Image);
      
      setPhase('LOGGED');
      NutritionService.logMeal(meal);
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (e) {
      console.error(e);
      alert("Analysis failed. Please try again.");
      setPhase('IDLE');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', zIndex: 2, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-system)', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px var(--accent-cyan)' }}>
          UNIVERSAL AI SCANNER
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={28} />
        </button>
      </div>

      {/* Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Reticle Overlay */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '250px', height: '250px', border: '2px solid rgba(0, 240, 255, 0.3)', borderRadius: '24px' }}>
          <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '20px', height: '20px', borderTop: '2px solid var(--accent-cyan)', borderLeft: '2px solid var(--accent-cyan)' }} />
          <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '20px', height: '20px', borderTop: '2px solid var(--accent-cyan)', borderRight: '2px solid var(--accent-cyan)' }} />
          <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '20px', height: '20px', borderBottom: '2px solid var(--accent-cyan)', borderLeft: '2px solid var(--accent-cyan)' }} />
          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderBottom: '2px solid var(--accent-cyan)', borderRight: '2px solid var(--accent-cyan)' }} />
        </div>

        {/* Phase Overlay */}
        {phase !== 'IDLE' && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-cyan)', zIndex: 3 }}>
            {phase === 'LOGGED' ? (
              <div style={{ fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 20px var(--accent-cyan)' }}>
                MEAL LOGGED
              </div>
            ) : (
              <>
                <Loader2 size={48} className="spin" style={{ marginBottom: '24px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>
                  {phase}...
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', background: '#000' }}>
        <button 
          onClick={captureAndAnalyze}
          disabled={phase !== 'IDLE'}
          style={{ 
            width: '80px', height: '80px', borderRadius: '40px', 
            background: phase === 'IDLE' ? 'var(--accent-cyan)' : 'var(--text-dim)', 
            border: '4px solid #fff', display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: phase === 'IDLE' ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          <CameraIcon size={32} color="#000" />
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};
