import React from 'react';
import { PanelProps } from '@grafana/data';
import { TimeSeries, TooltipPlugin, TooltipDisplayMode, ZoomPlugin } from '@grafana/ui';
import { SimpleOptions } from '../../types';
import { testIds } from '../testIds';
import { algo } from '../algo';
import { PanelDataErrorView } from '@grafana/runtime';

interface Props extends PanelProps<SimpleOptions> {}

export function SimplePanel({
  // Takes in a list of props used in this example
  options, // Options declared within module.ts and standard Grafana options
  data,
  width,
  height,
  timeZone,
  timeRange,
  onChangeTimeRange,
  fieldConfig,
  id,
}: Props) {
  
  let zScoreAnomalies = algo.ZScore(data.series, 3);
  let seasonalityAnomalies = algo.seasonalityAlgo(data.series, 0);

  data.series = algo.filterSeries(data.series, zScoreAnomalies.map((a, i) => a || seasonalityAnomalies[i]));

  if (data.series.length === 0) {
    return <PanelDataErrorView fieldConfig={fieldConfig} panelId={id} data={data} needsStringField />;
  }

  return (
    <div data-testid={testIds.panel.container}>
      <div>
        {options.showSeriesCount && (
          <div data-testid="simple-panel-series-counter">Number of series: {data.series.length}</div>
        )}
      </div>
      <TimeSeries
        width={width}
        height={height}
        timeRange={timeRange}
        timeZone={timeZone}
        frames={data.series}
        legend={options.legend}
      >
        {(config, alignedDataFrame) => {
          return (
            <>
              <TooltipPlugin
                config={config}
                data={alignedDataFrame}
                mode={TooltipDisplayMode.Multi}
                timeZone={timeZone}
              />
              <ZoomPlugin config={config} onZoom={onChangeTimeRange} />
            </>
          );
        }}
      </TimeSeries>
    </div>
  );
}
