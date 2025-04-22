import React, { useEffect, useRef, useState } from 'react';
import { THREEShaderHelper, Sounds } from 'threeshaderhelper';
import '../../styles/shaderVisualizer.css';

interface StandaloneShaderVisualizerProps {
  hegData?: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
  width?: number;
  height?: number;
  defaultGeometry?: 'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen';
}

export const StandaloneShaderVisualizer: React.FC<StandaloneShaderVisualizerProps> = ({
  hegData,
  width = 512,
  height = 512,
  defaultGeometry = 'plane'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderHelperRef = useRef<any>(null);
  const soundsRef = useRef<Sounds>(new Sounds());
  const [currentGeometry, setCurrentGeometry] = useState<'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen'>(defaultGeometry);
  
  // Initialize on mount
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initial setup
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    
    // Create the shader helper - exactly like in threeshader.tsx
    const shaderHelper = new THREEShaderHelper(
      canvas,
      soundsRef.current,
      THREEShaderHelper.defaultFragment,
      THREEShaderHelper.defaultVertex
    );
    
    shaderHelper.createRenderer();
    shaderHelperRef.current = shaderHelper;
    
    // Start animation loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      
      const time = now / 1000;
      
      // Update uniforms
      shaderHelperRef.current.setUniforms({
        iTime: { value: time },
        iResolution: { value: [canvas.width, canvas.height, 1] }
      });
      
      // Update with HEG data if available
      if (hegData) {
        shaderHelperRef.current.setUniforms({
          iHEG: { value: hegData.heg },
          iHEGAvg2s: { value: hegData.hegAvg2s },
          iHEGAvg4s: { value: hegData.hegAvg4s },
          iHEGEffort: { value: hegData.hegEffort },
          iHEGScore: { value: hegData.hegScore }
        });
      }
      
      shaderHelperRef.current.updateUniformSettings({
        iTime: time
      });
      
      shaderHelperRef.current.render();
      
      requestAnimationFrame(animate);
    };
    
    const animationFrame = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrame);
      if (shaderHelperRef.current) {
        // Any cleanup for the shader helper
      }
    };
  }, [width, height, hegData]);
  
  // Handle geometry changes
  useEffect(() => {
    if (!shaderHelperRef.current) return;
    shaderHelperRef.current.setMeshGeometry(currentGeometry);
  }, [currentGeometry]);
  
  // Handle geometry changes
  const handleGeometryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentGeometry(e.target.value as 'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen');
  };
  
  // Handle playing sound
  const handlePlaySound = () => {
    if (!soundsRef.current) return;
    soundsRef.current.decodeLocalAudioFile((sourceListIdx) => {
      soundsRef.current.playSound(sourceListIdx);
    });
  };
  
  return (
    <div className="shader-visualizer">
      <div className="shader-controls">
        <button 
          onClick={handlePlaySound}
          className="shader-button"
        >
          Play Sound
        </button>
        
        <select
          value={currentGeometry}
          onChange={handleGeometryChange}
          className="geometry-selector"
        >
          {['plane', 'sphere', 'halfsphere', 'circle', 'vrscreen'].map(
            (option) => (
              <option key={option} value={option}>
                {option}
              </option>
            )
          )}
        </select>
      </div>
      
      {hegData && (
        <div className="heg-indicators">
          <div className="heg-indicator">
            <span>HEG Effort:</span>
            <div className="indicator-bar">
              <div 
                className="indicator-fill" 
                style={{ width: `${hegData.hegEffort * 100}%` }}
              />
            </div>
          </div>
          <div className="heg-indicator">
            <span>HEG Score:</span>
            <div className="indicator-bar">
              <div 
                className="indicator-fill" 
                style={{ width: `${hegData.hegScore * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="shader-container">
        <canvas
          ref={canvasRef}
          className="shader-canvas"
        />
      </div>
    </div>
  );
};

export default StandaloneShaderVisualizer; 