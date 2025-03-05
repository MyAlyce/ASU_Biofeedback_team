import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { sComponent, state as stateHandler } from "react-scomponent";
import { Widget } from "../util/Widget";

type SensorType =
  | "heg_playback"
  | "heg"
  | "emg"
  | "ppg"
  | "ppg2"
  | "breath"
  | "hr"
  | "accel"
  | "compass"
  | "env"
  | "ecg";

interface ChartProps {
  height?: number | string;
  width?: number | string;
  presets?: SensorType[];
  streamId?: string;
  title?: string;
}

interface ChartState {
  deviceConnected: boolean;
  device?: any;
}

const RealTimeChart = ({ data }) => {
  return (
    <LineChart
      width={800}
      height={400}
      data={data}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis />
      <Tooltip />
      <Legend />
      {Object.keys(data[0] || {})
        .filter((key) => key !== "time")
        .map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        ))}
    </LineChart>
  );
};

export class Chart extends sComponent<ChartProps, ChartState> {
  state = {
    deviceConnected: false,
    device: undefined,
    data: [],
  };

  subscriptions: any = {};
  presets?: SensorType[];
  streamId?: string;
  title?: string;

  constructor(props: ChartProps) {
    super(props as any);
    this.presets = props.presets;
    this.streamId = props.streamId;
    this.title = props.title;
  }

  componentDidMount = () => {
    if (this.presets) {
      for (let key of this.presets) {
        this.subscriptions[key] = stateHandler.subscribeEvent(
          this.streamId ? this.streamId + key : key,
          (data) => {
            this.setState((prevState) => ({
              data: [
                ...prevState.data,
                { time: new Date().toLocaleTimeString(), ...data },
              ].slice(-10),
            }));
          }
        );
      }
    }
  };

  componentWillUnmount = () => {
    for (const key in this.subscriptions) {
      stateHandler.unsubscribeEvent(
        this.streamId ? this.streamId + key : key,
        this.subscriptions[key]
      );
    }
  };

  render() {
    return (
      <Widget
        title={this.title}
        content={
          <div>
            <RealTimeChart data={this.state.data} />
          </div>
        }
      />
    );
  }
}
