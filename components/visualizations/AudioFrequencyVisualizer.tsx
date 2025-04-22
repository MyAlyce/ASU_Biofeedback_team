import React, { useEffect, useRef } from 'react';

interface AudioFrequencyVisualizerProps {
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isActive: boolean;
}

const AudioFrequencyVisualizer: React.FC<AudioFrequencyVisualizerProps> = ({ 
  audioContext, 
  sourceNode, 
  isActive 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isActive || !audioContext || !sourceNode) return;

    // Create analyzer node if it doesn't exist
    if (!analyserRef.current) {
      try {
        analyserRef.current = audioContext.createAnalyser();
        analyserRef.current.fftSize = 2048;
        analyserRef.current.smoothingTimeConstant = 0.8;
        
        // Connect source to analyzer (don't disconnect existing connections)
        sourceNode.connect(analyserRef.current);
      } catch (err) {
        console.error('Error creating analyzer node:', err);
        return;
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Create data array for frequency data
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!ctx || !analyser) return;

      // Request next frame first to ensure smooth animation
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Get frequency data
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 25, 50, 1)');
      gradient.addColorStop(1, 'rgba(0, 5, 25, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw frequency bars
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        if (i % 2 === 0) { // Skip every other value for better visual spacing
          const barHeight = (dataArray[i] / 255) * canvas.height;
          
          // Create gradient for bars
          const barGradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
          barGradient.addColorStop(0, 'rgba(0, 220, 255, 0.9)');
          barGradient.addColorStop(0.5, 'rgba(100, 180, 255, 0.7)');
          barGradient.addColorStop(1, 'rgba(180, 100, 255, 0.5)');
          
          ctx.fillStyle = barGradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          
          x += barWidth + 1;
        }
      }
      
      // Draw time domain waveform on top
      analyser.getByteTimeDomainData(dataArray);
      
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      
      const sliceWidth = canvas.width / bufferLength;
      x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    };
    
    // Start animation
    draw();
    
    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Disconnect analyzer when component unmounts or becomes inactive
      if (analyserRef.current) {
        try {
          sourceNode.disconnect(analyserRef.current);
        } catch (e) {
          // Handle disconnection errors
          console.log('Note: Analyzer already disconnected');
        }
      }
    };
  }, [audioContext, sourceNode, isActive]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="audio-frequency-canvas"
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#051530',
        borderRadius: '6px'
      }}
    />
  );
};

export default AudioFrequencyVisualizer; 