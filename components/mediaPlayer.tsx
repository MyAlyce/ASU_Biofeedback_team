import React, { useEffect, useRef, useState } from 'react';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';
import '../styles/videocontrols.css';
import { SoundCloudPlayer } from './players/soundcloud';

const MediaPlayer = ({ id }: { id: string }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [volume, setVolume] = useState(100);
  const [collapsed, setCollapsed] = useState(false); // State for collapse
  let stateSub: number;

  // Handle HEG volume control
  useEffect(() => {
    stateSub = subscribeHEGPlayback((data) => {
      console.log('HEG Data:', data);
      let newVolume = volume + data.hegEffort[0];
      newVolume = Math.max(0, Math.min(100, newVolume));
      setVolume(newVolume);
      if (videoRef.current) {
        videoRef.current.volume = newVolume / 100;
      }
    });

    return () => {
      unsubscribeHEGPlayback(stateSub);
    };
  }, [volume]);

  // Toggle collapsed state
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`media-player ${collapsed ? 'collapsed' : ''}`}>
      <button className="collapse-btn" onClick={toggleCollapse}>
        {collapsed ? '↓ Show Player' : '↑ Hide Player'}
      </button>

      <div className={`content ${collapsed ? 'hidden' : ''}`}>
        <h2>SoundCloud Player</h2>
        <SoundCloudPlayer autoPlay={true} color="blue" />
      </div>
    </div>
  );
};

export default MediaPlayer;
