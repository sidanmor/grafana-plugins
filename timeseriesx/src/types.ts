import { VizLegendOptions } from '@grafana/schema';

type SeriesSize = 0 | 1 | 2;

export interface SimpleOptions {
  anomalyDetection: boolean;
  sensitivityMode: SeriesSize;
  legend: VizLegendOptions;
}
