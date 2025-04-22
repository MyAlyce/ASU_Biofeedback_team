import React, { useEffect, useRef } from 'react';

interface AudioWaveformVisualizerProps {
  isActive: boolean;
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  width?: number;
  height?: number;
}

const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  isActive,
  audioContext,
  sourceNode,
  width = 500,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    // Only set up when active, with audio context and source node
    if (isActive && audioContext && sourceNode && canvasRef.current) {
      // Create analyzer if it doesn't exist
      if (!analyzerRef.current) {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 2048; // Large FFT for detailed waveform
        
        // Connect source to analyzer (without disrupting other connections)
        sourceNode.connect(analyzerRef.current);
        
        // Create data array for time domain data
        const bufferLength = analyzerRef.current.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);
        
        console.log('Waveform analyzer set up with buffer length:', bufferLength);
      }
      
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext('2d');
      
      if (!canvasCtx) {
        console.error('Could not get canvas context');
        return;
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Animation function to draw waveform
      const draw = () => {
        if (!analyzerRef.current || !dataArrayRef.current || !canvasCtx) {
          animationFrameRef.current = requestAnimationFrame(draw);
          return;
        }
        
        // Get waveform data
        analyzerRef.current.getByteTimeDomainData(dataArrayRef.current);
        
        // Clear canvas
        canvasCtx.fillStyle = 'rgb(20, 20, 30)';
        canvasCtx.fillRect(0, 0, width, height);
        
        // Draw waveform
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 200, 255)';
        canvasCtx.beginPath();
        
        const sliceWidth = width / dataArrayRef.current.length;
        let x = 0;
        
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const v = dataArrayRef.current[i] / 128.0; // Convert to range roughly 0-2
          const y = v * height / 2;
          
          if (i === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }
          
          x += sliceWidth;
        }
        
        canvasCtx.lineTo(width, height / 2);
        canvasCtx.stroke();
        
        // Continue animation
        animationFrameRef.current = requestAnimationFrame(draw);
      };
      
      // Start animation
      draw();
    }
    
    // Cleanup function
    return () => {
      // Cancel animation frame if it exists
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Disconnect analyzer if it exists
      if (analyzerRef.current && sourceNode) {
        try {
          sourceNode.disconnect(analyzerRef.current);
        } catch (error) {
          console.error('Error disconnecting waveform analyzer:', error);
        }
      }
    };
  }, [isActive, audioContext, sourceNode, width, height]);
  
  return (
    <canvas
      ref={canvasRef}
      className="waveform-visualizer-canvas"
      width={width}
      height={height}
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default AudioWaveformVisualizer; 