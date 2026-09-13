import React, { useRef, useState, useEffect } from 'react';
import { NutritionService, type AIAnalysisResult } from '../workout/NutritionService';
import { X, Camera as CameraIcon, Loader2, AlertTriangle, Bug } from 'lucide-react';
import { HapticService } from '../workout/HapticService';

interface CameraScannerProps {
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [phase, setPhase] = useState<'IDLE' | 'ANALYZING' | 'REJECTED' | 'LOGGED' | 'ERROR'>('IDLE');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  
  // Diagnostics State
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<AIAnalysisResult['diagnostics'] | null>(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '');
  const [modelName, setModelName] = useState(localStorage.getItem('GEMINI_MODEL_NAME') || 'gemini-1.5-flash-latest');

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };
  
  const saveModelName = (name: string) => {
    setModelName(name);
    localStorage.setItem('GEMINI_MODEL_NAME', name);
  };
  
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
    setDiagnostics(null);
    setRejectionReason('');
    
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
    const scanId = 'scan_' + crypto.randomUUID().substring(0, 8);

    try {
      const result = await NutritionService.analyzeFoodImage(base64Image, scanId, modelName);
      setDiagnostics(result.diagnostics);

      if (result.success && result.meal) {
        setPhase('LOGGED');
        NutritionService.logMeal(result.meal);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        HapticService.error();
        setPhase('REJECTED');
        setRejectionReason(result.reason || 'NO FOOD DETECTED');
      }
      
    } catch (e) {
      console.error(e);
      HapticService.error();
      setPhase('ERROR');
      setRejectionReason('SCAN FAILED — PLEASE TRY AGAIN');
    }
  };

  const resetScanner = () => {
    setPhase('IDLE');
    setRejectionReason('');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px', display: 'flex', justifyContent: 'space-between', zIndex: 4, background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-system)', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 10px var(--accent-cyan)' }}>
            UNIVERSAL AI SCANNER
          </div>
          <button onClick={() => setShowDiagnostics(!showDiagnostics)} style={{ background: 'none', border: '1px solid var(--text-dim)', color: 'var(--text-dim)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>
            <Bug size={14} style={{ display: 'inline', marginRight: '4px' }}/> DIAGNOSTICS
          </button>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={28} />
        </button>
      </div>

      {/* Diagnostics Panel Overlay */}
      {showDiagnostics && (
        <div style={{ position: 'absolute', top: '80px', left: '20px', right: '20px', bottom: '120px', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', border: '1px solid var(--accent-cyan)', borderRadius: '12px', zIndex: 10, overflowY: 'auto', padding: '16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          <h3 style={{ color: 'var(--accent-cyan)', marginTop: 0 }}>DEVELOPER DIAGNOSTICS</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>GEMINI API KEY:</div>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => saveApiKey(e.target.value)} 
              placeholder="Paste API Key here..."
              style={{ width: '100%', padding: '8px', background: 'var(--surface-bg)', color: '#fff', border: '1px solid var(--border-accent)', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>MODEL NAME:</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={modelName} 
                onChange={(e) => saveModelName(e.target.value)} 
                placeholder="gemini-1.5-flash-latest"
                style={{ flex: 1, padding: '8px', background: 'var(--surface-bg)', color: '#fff', border: '1px solid var(--border-accent)', borderRadius: '4px', fontFamily: 'monospace' }}
              />
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                    const data = await res.json();
                    if (data.models) {
                      const modelNames = data.models.map((m: any) => m.name.replace('models/', '')).join('\n');
                      alert("AVAILABLE MODELS FOR YOUR KEY:\n\n" + modelNames);
                    } else {
                      alert("Error fetching models: " + JSON.stringify(data));
                    }
                  } catch (e: any) {
                    alert("Network error: " + e.message);
                  }
                }}
                style={{ padding: '8px 16px', background: 'var(--accent-cyan)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                CHECK MODELS
              </button>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Click CHECK MODELS to see which models your API key actually supports.
            </div>
          </div>

          {diagnostics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><span style={{ color: 'var(--text-dim)' }}>SCAN ID:</span> {diagnostics.scanId}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Camera capture:</span> {diagnostics.cameraCapture}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Image created:</span> {diagnostics.imageCreated}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Image size:</span> {diagnostics.imageSize}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Image type:</span> {diagnostics.imageType}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Image sent to API:</span> {diagnostics.imageSent}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>API request:</span> {diagnostics.apiRequest}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>API status:</span> {diagnostics.apiStatus}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Vision response received:</span> {diagnostics.visionResponseReceived}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Raw AI response available:</span> {diagnostics.rawResponseAvailable}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Response parsing:</span> {diagnostics.responseParsing}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Food detection result:</span> {diagnostics.foodDetectionResult}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Final result:</span> {diagnostics.finalResult}</div>
              <div><span style={{ color: 'var(--text-dim)' }}>Error:</span> <span style={{ color: 'var(--accent-alert)' }}>{diagnostics.error || 'NONE'}</span></div>
              
              {diagnostics.rawResponse && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ color: 'var(--text-dim)', marginBottom: '4px' }}>Raw JSON Response:</div>
                  <pre style={{ background: '#111', padding: '8px', borderRadius: '4px', overflowX: 'auto', color: 'var(--text-secondary)' }}>
                    {JSON.stringify(diagnostics.rawResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-dim)' }}>No scan initiated yet.</div>
          )}
        </div>
      )}

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
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-cyan)', zIndex: 3, padding: '24px', textAlign: 'center' }}>
            
            {phase === 'ANALYZING' && (
              <>
                <Loader2 size={48} className="spin" style={{ marginBottom: '24px' }} />
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>
                  ANALYZING IMAGE...
                </div>
              </>
            )}

            {phase === 'LOGGED' && (
              <div style={{ fontSize: '2rem', fontWeight: 'bold', textShadow: '0 0 20px var(--accent-cyan)' }}>
                MEAL LOGGED
              </div>
            )}

            {(phase === 'REJECTED' || phase === 'ERROR') && (
              <>
                <AlertTriangle size={48} style={{ color: 'var(--accent-alert)', marginBottom: '16px' }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-alert)', marginBottom: '12px' }}>
                  {rejectionReason.toUpperCase()}
                </div>
                {phase === 'REJECTED' && (
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                    Point the camera clearly at food and scan again.
                  </div>
                )}
                <button 
                  onClick={resetScanner}
                  style={{ background: 'none', border: '1px solid var(--text-dim)', color: '#fff', padding: '12px 24px', borderRadius: '24px', fontSize: '1rem', cursor: 'pointer' }}
                >
                  TRY AGAIN
                </button>
              </>
            )}

          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', background: '#000' }}>
        <button 
          onClick={captureAndAnalyze}
          disabled={phase === 'ANALYZING'}
          style={{ 
            width: '80px', height: '80px', borderRadius: '40px', 
            background: phase === 'ANALYZING' ? 'var(--text-dim)' : 'var(--accent-cyan)', 
            border: '4px solid #fff', display: 'flex', justifyContent: 'center', alignItems: 'center',
            cursor: phase === 'ANALYZING' ? 'not-allowed' : 'pointer',
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
