import React from "react";
import {
  ArgumentAxis,
  ValueAxis,
  Chart,
  LineSeries,
  Tooltip,
  ZoomAndPan,
  Legend
} from "@devexpress/dx-react-chart-material-ui";
import { Paper } from "@material-ui/core";
import { RegistroTypeString } from "./App";
import { EventTracker } from "@devexpress/dx-react-chart";
interface Props {
  datos: RegistroTypeString[];
  valueField: string;
  argumentField: string;
}

const ChartsComponent = ({ datos, valueField, argumentField }: Props) => {
  return (
    <Paper>
      <Chart data={datos}>
        <ArgumentAxis  />
        <ValueAxis />

        <LineSeries name="Registro RR" color="red" valueField={valueField} argumentField={argumentField} />
        <EventTracker />
        <Tooltip />
        <ZoomAndPan />
        <Legend position="bottom"  />
        
      </Chart>
    </Paper>
  );
};

export default ChartsComponent;
