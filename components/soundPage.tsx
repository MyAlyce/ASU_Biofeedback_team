import React from 'react';
import { ShaderPlayer } from './threejs/threeshader'
import MediaPlayer from './mediaPlayer';


const SoundPage = () => {
    return(
<div className = "soundPage">
    <div>
        <MediaPlayer id="media1" />
    </div>
    <ShaderPlayer/>
</div>);
};

export default SoundPage;

