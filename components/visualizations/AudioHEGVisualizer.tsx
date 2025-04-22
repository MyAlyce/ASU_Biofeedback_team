import React, { useEffect, useRef, useState } from 'react';

interface AudioHEGVisualizerProps {
  hegData: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
  isActive: boolean;
  audioContext?: AudioContext | null;
  sourceNode?: MediaElementAudioSourceNode | null;
}

const AudioHEGVisualizer: React.FC<AudioHEGVisualizerProps> = ({ 
  hegData, 
  isActive,
  audioContext,
  sourceNode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  
  // State to store history of HEG values
  const [hegHistory, setHegHistory] = useState<number[]>(Array(100).fill(0));
  const [avgHistory, setAvgHistory] = useState<number[]>(Array(100).fill(0));
  const [effortHistory, setEffortHistory] = useState<number[]>(Array(100).fill(0));
  
  // Use useRef to track previous values to prevent glitches
  const prevHegRef = useRef<number>(0);
  const prevAvgRef = useRef<number>(0);
  const prevEffortRef = useRef<number>(0);
  
  // Update history with new HEG data
  useEffect(() => {
    if (!isActive) return;
    
    // Only update if we have valid data and it has changed
    if (hegData && Math.abs(hegData.heg - prevHegRef.current) < 1000) {
      // Use functional updates to avoid race conditions
      setHegHistory(prev => {
        const newArray = [...prev];
        newArray.shift();
        newArray.push(hegData.heg !== undefined ? hegData.heg : prevHegRef.current);
        return newArray;
      });
      
      setAvgHistory(prev => {
        const newArray = [...prev];
        newArray.shift();
        newArray.push(hegData.hegAvg4s !== undefined ? hegData.hegAvg4s : prevAvgRef.current);
        return newArray;
      });
      
      setEffortHistory(prev => {
        const newArray = [...prev];
        newArray.shift();
        newArray.push(hegData.hegEffort !== undefined ? hegData.hegEffort : prevEffortRef.current);
        return newArray;
      });
      
      // Update previous values
      prevHegRef.current = hegData.heg || prevHegRef.current;
      prevAvgRef.current = hegData.hegAvg4s || prevAvgRef.current;
      prevEffortRef.current = hegData.hegEffort || prevEffortRef.current;
    }
  }, [hegData, isActive]);
  
  // Set up audio analyzer
  useEffect(() => {
    if (isActive && audioContext && sourceNode && !analyzerRef.current) {
      try {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 512;
        
        sourceNode.connect(analyzerRef.current);
        
        const bufferLength = analyzerRef.current.frequencyBinCount;
        frequencyDataRef.current = new Uint8Array(bufferLength);
        timeDataRef.current = new Uint8Array(bufferLength);
        
        console.log('Audio analyzer set up for HEG visualization');
      } catch (error) {
        console.error('Error setting up audio analyzer for HEG viz:', error);
      }
    }
    
    return () => {
      if (analyzerRef.current && sourceNode) {
        try {
          sourceNode.disconnect(analyzerRef.current);
        } catch (e) {
          // Ignore disconnection errors
        }
        analyzerRef.current = null;
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, audioContext, sourceNode]);
  
  // Main rendering function
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    let startTime = performance.now();
    
    const drawVisualization = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const now = performance.now();
      const elapsed = now - startTime;
      
      // Get audio data if available
      let hasAudioData = false;
      if (analyzerRef.current && frequencyDataRef.current && timeDataRef.current) {
        try {
          analyzerRef.current.getByteFrequencyData(frequencyDataRef.current);
          analyzerRef.current.getByteTimeDomainData(timeDataRef.current);
          hasAudioData = true;
        } catch (e) {
          console.error('Error getting audio data:', e);
        }
      }
      
      // Draw background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 20, 30, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 10, 20, 0.9)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Horizontal grid lines
      for (let i = 0; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      // Draw audio waveform if available
      if (hasAudioData && timeDataRef.current) {
        ctx.beginPath();
        const waveformData = timeDataRef.current;
        const sliceWidth = canvas.width / waveformData.length;
        
        ctx.strokeStyle = 'rgba(0, 220, 255, 0.5)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < waveformData.length; i++) {
          const x = i * sliceWidth;
          const y = (waveformData[i] / 128.0) * (canvas.height / 3) + (canvas.height / 3);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      }
      
      // Draw frequency bars if available
      if (hasAudioData && frequencyDataRef.current) {
        const freqData = frequencyDataRef.current;
        const barWidth = (canvas.width / freqData.length) * 2.5;
        let x = 0;
        
        for (let i = 0; i < freqData.length; i++) {
          const barHeight = (freqData[i] / 255) * (canvas.height / 3);
          
          const hue = i / freqData.length * 360;
          const saturation = 70 + Math.abs(hegData.hegEffort) * 30;
          const lightness = 50;
          
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      }
      
      // Helper function to draw waveforms
      const drawData = (data: number[], color: string, lineWidth: number, heightScale: number, offset: number) => {
        if (!data || data.length === 0) return;
        
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        
        const step = canvas.width / (data.length - 1);
        
        for (let i = 0; i < data.length; i++) {
          // Clamp and normalize values to prevent NaN or Infinity
          const normalizedValue = Math.max(-1, Math.min(1, isFinite(data[i]) ? data[i] : 0));
          const y = (canvas.height / 2) - (normalizedValue * heightScale) + offset;
          const x = i * step;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.stroke();
      };
      
      // Draw HEG data streams
      drawData(hegHistory, 'rgba(255, 100, 100, 0.8)', 2, canvas.height / 4, -30);
      drawData(avgHistory, 'rgba(100, 255, 100, 0.8)', 2, canvas.height / 4, 0);
      
      // Add glow effect to effort data
      ctx.shadowColor = 'rgba(100, 180, 255, 0.8)';
      ctx.shadowBlur = 10;
      drawData(effortHistory, 'rgba(100, 180, 255, 0.9)', 3, canvas.height / 3, 30);
      ctx.shadowBlur = 0;
      
      // Draw labels
      ctx.font = '12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText('RAW HEG', 10, 20);
      ctx.fillText('HEG AVG', 10, 40);
      ctx.fillText('HEG EFFORT', 10, 60);
      
      // Draw current values
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.fillText(`${hegData.heg !== undefined ? hegData.heg.toFixed(4) : "N/A"}`, canvas.width - 100, 20);
      
      ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
      ctx.fillText(`${hegData.hegAvg4s !== undefined ? hegData.hegAvg4s.toFixed(4) : "N/A"}`, canvas.width - 100, 40);
      
      ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
      ctx.fillText(`${hegData.hegEffort !== undefined ? hegData.hegEffort.toFixed(4) : "N/A"}`, canvas.width - 100, 60);
      
      // Draw brain activity pulse
      const pulseSize = 50 + Math.abs(hegData.hegEffort || 0) * 30;
      const pulseX = canvas.width / 2;
      const pulseY = canvas.height / 2;
      
      const pulseGradient = ctx.createRadialGradient(
        pulseX, pulseY, 0,
        pulseX, pulseY, pulseSize
      );
      
      if ((hegData.hegEffort || 0) >= 0) {
        pulseGradient.addColorStop(0, 'rgba(100, 255, 150, 0.8)');
        pulseGradient.addColorStop(1, 'rgba(100, 255, 150, 0)');
      } else {
        pulseGradient.addColorStop(0, 'rgba(255, 100, 100, 0.8)');
        pulseGradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
      }
      
      // Modulate pulse with audio if available
      if (hasAudioData && frequencyDataRef.current) {
        const avgFrequency = frequencyDataRef.current.reduce((sum, value) => sum + value, 0) / 
                            frequencyDataRef.current.length;
        const pulseModulation = avgFrequency / 255 * 20;
        
        ctx.beginPath();
        ctx.fillStyle = pulseGradient;
        ctx.arc(pulseX, pulseY, pulseSize + pulseModulation + Math.sin(elapsed * 0.005) * 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.fillStyle = pulseGradient;
        ctx.arc(pulseX, pulseY, pulseSize + Math.sin(elapsed * 0.005) * 10, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(drawVisualization);
    };
    
    // Start the visualization
    drawVisualization();
    
    // Handle window resize
    const handleResize = () => {
      if (canvas) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isActive]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="heg-visualizer-canvas"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '8px'
      }}
    />
  );
};

export default AudioHEGVisualizer; 