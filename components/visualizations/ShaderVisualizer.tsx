import React, { useEffect, useRef, useState } from 'react';
import { THREEShaderHelper, Sounds } from 'threeshaderhelper';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../../scripts/connect';

interface ShaderVisualizerProps {
  isActive: boolean;
  geometry?: 'plane' | 'sphere' | 'halfsphere' | 'circle' | 'vrscreen';
  height?: number;
  width?: number;
  hegData: {
    heg: number;
    hegAvg2s: number;
    hegAvg4s: number;
    hegEffort: number;
    hegScore: number;
  };
}

const ShaderVisualizer: React.FC<ShaderVisualizerProps> = ({
  isActive,
  geometry = 'plane',
  height = 240,
  width = 320,
  hegData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shaderHelperRef = useRef<THREEShaderHelper | null>(null);
  const soundsRef = useRef<Sounds | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const animationFrameRef = useRef<number>(0);

  // Initialize the canvas and shader helper
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    // Only initialize once
    if (!isInitialized) {
      const sounds = new Sounds();
      soundsRef.current = sounds;

      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;

      // Instantiate the THREEShaderHelper
      const shaderHelper = new THREEShaderHelper(
        canvas,
        sounds,
        THREEShaderHelper.defaultFragment,
        THREEShaderHelper.defaultVertex
      );

      shaderHelper.createRenderer();
      shaderHelper.setMeshGeometry(geometry);
      shaderHelperRef.current = shaderHelper;

      setIsInitialized(true);
    }

    // Set up animation loop if active
    if (isActive && isInitialized && shaderHelperRef.current) {
      const updateShader = () => {
        const shaderHelper = shaderHelperRef.current;
        if (!shaderHelper) return;

        // Update time uniform
        shaderHelper.setUniforms({ iTime: { value: performance.now() / 1000 } });
        shaderHelper.updateUniformSettings({ iTime: performance.now() / 1000 });

        // Handle canvas resizing based on HEG data
        const hegEffort = hegData.hegEffort;
        
        // Apply HEG effort to shader size
        if (hegEffort > 0 && shaderHelper.canvas.width < 1024) {
          const growFactor = Math.sqrt(hegEffort + 1);
          const newWidth = shaderHelper.canvas.width * growFactor;
          const newHeight = shaderHelper.canvas.height * growFactor;
          
          // Clamp to reasonable max size
          shaderHelper.canvas.width = Math.min(newWidth, 1024);
          shaderHelper.canvas.height = Math.min(newHeight, 768);
        } else if (hegEffort < 0 && shaderHelper.canvas.width > 256) {
          const shrinkFactor = Math.sqrt(1 - hegEffort);
          const newWidth = shaderHelper.canvas.width / shrinkFactor;
          const newHeight = shaderHelper.canvas.height / shrinkFactor;
          
          // Clamp to reasonable min size
          shaderHelper.canvas.width = Math.max(newWidth, 256);
          shaderHelper.canvas.height = Math.max(newHeight, 256);
        }

        // Update resolution uniform
        shaderHelper.setUniforms({
          iResolution: {
            value: [shaderHelper.canvas.width, shaderHelper.canvas.height]
          }
        });

        // Update canvas style dimensions
        if (canvasRef.current) {
          canvasRef.current.style.width = '100%';
          canvasRef.current.style.height = '100%';
        }

        animationFrameRef.current = requestAnimationFrame(updateShader);
      };

      // Start animation loop
      updateShader();
    }

    return () => {
      // Clean up animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isInitialized, geometry, hegData, width, height]);

  // Handle changes to geometry
  useEffect(() => {
    if (isInitialized && shaderHelperRef.current) {
      shaderHelperRef.current.setMeshGeometry(geometry);
    }
  }, [geometry, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Cleanup shader helper
      shaderHelperRef.current = null;
      soundsRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="shader-visualizer-canvas"
      style={{
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none',
        borderRadius: '6px',
        backgroundColor: '#000'
      }}
    />
  );
};

export default ShaderVisualizer; 