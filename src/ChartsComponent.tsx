import React, { useState } from "react";
import {
  ArgumentAxis,
  ValueAxis,
  Chart,
  LineSeries,
  Tooltip,
  ZoomAndPan,
  Legend,
} from "@devexpress/dx-react-chart-material-ui";
import { Paper } from "@material-ui/core";
import { RegistroTypeString } from "./App";
import { EventTracker, Viewport } from "@devexpress/dx-react-chart";

interface Props {
  datos: RegistroTypeString[];
  valueField: string;
  argumentField: string;
  name: string;
}

const ChartsComponent = ({ datos, valueField, argumentField, name }: Props) => {
  const [viewport, viewportChange] = useState<Viewport>()
  return (
    <Paper>
      <Chart data={datos}>
        <ArgumentAxis showLabels={false} />
        <ValueAxis />

        <LineSeries
          name={name}
          color="red"
          valueField={valueField}
          argumentField={argumentField}
        />
        <EventTracker />
        <Tooltip />
        <ZoomAndPan viewport={viewport} onViewportChange={viewportChange} />
        <Legend position="bottom" />
      </Chart>
    </Paper>
  );
};

export default ChartsComponent;
