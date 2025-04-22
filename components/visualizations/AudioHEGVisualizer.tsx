import React, { useEffect, useRef } from 'react';

interface AudioHEGVisualizerProps {
  hegData: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
  isActive: boolean;
}

const AudioHEGVisualizer: React.FC<AudioHEGVisualizerProps> = ({ hegData, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    // Only run visualization if active
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale values for visualization
      const effort = Math.abs(hegData.hegEffort) * 10; // Amplify for visual effect
      const normalizedEffort = Math.min(Math.max(effort, 0), 100);
      
      // Responsive background color based on effort
      const r = Math.floor(normalizedEffort * 2.55);
      const g = Math.floor(100 - normalizedEffort * 0.5);
      const b = Math.floor(255 - normalizedEffort * 2);
      
      // Background gradient based on HEG values
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
      gradient.addColorStop(1, `rgb(${Math.floor(r/2)}, ${Math.floor(g/2)}, ${Math.floor(b*1.5)})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw circles that pulse with HEG values
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Draw outer circle (responds to HEG score)
      const maxRadius = Math.min(canvas.width, canvas.height) / 2 - 20;
      const scoreRadius = (Math.abs(hegData.hegScore) % 100) / 100 * maxRadius + 50;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, scoreRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
      
      // Draw middle circle (responds to 2s average)
      const avg2sRadius = Math.abs(hegData.hegAvg2s) % 100 / 10 + 30;
      ctx.beginPath();
      ctx.arc(centerX, centerY, avg2sRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      
      // Draw inner circle (responds to effort)
      const effortRadius = normalizedEffort / 5 + 20;
      ctx.beginPath();
      ctx.arc(centerX, centerY, effortRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
      
      // Draw waveform-like visualization along bottom
      const waveHeight = canvas.height / 4;
      const waveY = canvas.height - waveHeight/2;
      
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      
      for (let x = 0; x < canvas.width; x += 5) {
        const xNorm = x / canvas.width;
        const y = waveY + Math.sin(xNorm * 10 + Date.now() / 500) * waveHeight/3 * (hegData.hegEffort/5 + 0.5);
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(canvas.width, waveY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    // Cleanup animation frame on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hegData, isActive]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="audio-heg-canvas"
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#333',
        borderRadius: '6px'
      }}
    />
  );
};

export default AudioHEGVisualizer; 