import React, {Component, createRef, RefObject} from 'react'
import { THREEShaderHelper, Sounds } from 'threeshaderhelper';

import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../../scripts/connect';


// Define the types for props and state
interface ShaderPlayerProps {
    canvasWidth?: number;
    canvasHeight?: number;
}
  
interface ShaderPlayerState {
    selectedGeometry: 'plane'|'sphere'|'halfsphere'|'circle'|'vrscreen';
    canvasWidth: number;
    canvasHeight: number;
}

export class ShaderPlayer extends Component<ShaderPlayerProps, ShaderPlayerState> {
    canvasRef: RefObject<HTMLCanvasElement>;
    shaderHelper: THREEShaderHelper;
    sounds: Sounds;

    stateSub:number;
  
    constructor(props: ShaderPlayerProps) {
      super(props);
  
      this.state = {
        selectedGeometry: 'plane',
        canvasWidth: 512,
        canvasHeight: 512,
      };
  
      this.canvasRef = createRef<HTMLCanvasElement>();
      this.sounds = new Sounds();
    }
  
    volume = 100;

    componentDidMount() {
      this.initializeCanvas();

      this.stateSub = subscribeHEGPlayback((data)=>{
        this.volume += data.hegEffort[0];
        if (this.volume > 100) 
          this.volume = 100;
        else if (this.volume < 0) this.volume = 0;
          this.sounds.sourceList.forEach((v,i) => {this.sounds.setVolume(i,this.volume/100);});
        

          //epilepsy warning. not sure how to make the transition seamless without a flicker.

        if ((data.hegEffort[0] > 0) && (this.shaderHelper.canvas.width < 1024)) {
          // make canvas ref bigger
          this.shaderHelper.canvas.width = this.shaderHelper.canvas.width * (Math.sqrt(data.hegEffort[0] + 1));
          this.shaderHelper.canvas.height = this.shaderHelper.canvas.height * (Math.sqrt(data.hegEffort[0] + 1));

          console.log(this.shaderHelper.canvas.width);
          //this.canvasRef.current.width = this.shaderHelper.canvas.width;
          //this.canvasRef.current.height = this.shaderHelper.canvas.height;


        }

        if ((data.hegEffort[0] < 0) && (this.shaderHelper.canvas.width > 256)) {

          this.shaderHelper.canvas.width = this.shaderHelper.canvas.width / Math.sqrt((1 - data.hegEffort[0]));
          this.shaderHelper.canvas.height = this.shaderHelper.canvas.height / Math.sqrt((1- data.hegEffort[0]));

          console.log(this.shaderHelper.canvas.width);

       
        }

        this.shaderHelper.setUniforms({iTime: {value: performance.now() / 1000}});
        this.shaderHelper.updateUniformSettings({iTime: performance.now() / 1000});

        this.canvasRef.current.style.width = `${this.shaderHelper.canvas.width}px`;
        this.canvasRef.current.style.height = `${this.shaderHelper.canvas.height}px`;
        this.shaderHelper.setUniforms({
          iResolution: { value: (this.shaderHelper.canvas.width, this.shaderHelper.canvas.height) }
        });

        this.shaderHelper.updateUniformSettings(
          {iImage: (this.shaderHelper.canvas.width, this.shaderHelper.canvas.height)}
        );

        this.render();
        
        
      });

    }

    componentWillUnmount(): void {
        unsubscribeHEGPlayback(this.stateSub);
    }
  
    initializeCanvas = () => {
      const canvas = this.canvasRef.current;
      if (!canvas) return; // Early return if ref is not attached yet
  
      canvas.width = this.state.canvasWidth;
      canvas.height = this.state.canvasHeight;
  
      // Instantiate the THREEShaderHelper with the canvas
      this.shaderHelper = new THREEShaderHelper(
        canvas,
        this.sounds,
        THREEShaderHelper.defaultFragment,
        THREEShaderHelper.defaultVertex
      );
  
      this.shaderHelper.createRenderer();
    };
  
    handleGeometryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedGeometry = event.target.value as ShaderPlayerState["selectedGeometry"];
      this.setState({ selectedGeometry });
      this.shaderHelper?.setMeshGeometry(selectedGeometry);
    };
  
    handlePlaySound = () => {
      this.sounds.decodeLocalAudioFile((sourceListIdx) => {
        this.sounds.playSound(sourceListIdx);
      });
    };
  
    render() {
      return (
        <div>
          <button onClick={this.handlePlaySound}>Play Sound</button>
  
          <select
            value={this.state.selectedGeometry}
            onChange={this.handleGeometryChange}
          >
            {['plane', 'sphere', 'halfsphere', 'circle', 'vrscreen'].map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            )}
          </select>
  
          <br />
  
          <canvas
            ref={this.canvasRef}
            style={{
              width: `${this.state.canvasWidth}px`,
              height: `${this.state.canvasHeight}px`,
            }}
          ></canvas>
        </div>
      );
    }
  }