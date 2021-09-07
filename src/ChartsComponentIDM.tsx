import React from "react";
import {
  ArgumentAxis,
  ValueAxis,
  Chart,
  LineSeries,
  Tooltip,
  Legend,
} from "@devexpress/dx-react-chart-material-ui";
import { Paper } from "@material-ui/core";
import { RegistroIntervalo } from "./App";
import { EventTracker } from "@devexpress/dx-react-chart";

interface Props {
  datos: RegistroIntervalo[];
  valueField: string;
  argumentField: string;
  name: string;
}

const ChartsComponentIDM = ({
  datos,
  valueField,
  argumentField,
  name,
}: Props) => {
  return (
    <Paper>
      <Chart data={datos}>
        <ArgumentAxis />
        <ValueAxis />

        <LineSeries
          name={name}
          valueField={valueField}
          argumentField={argumentField}
          color="#cd7f32"
        />

        <EventTracker />
        <Tooltip />
        <Legend position="bottom" />
      </Chart>
    </Paper>
  );
};

export default ChartsComponentIDM;
