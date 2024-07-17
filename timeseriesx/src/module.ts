import { PanelPlugin, FieldColorModeId } from '@grafana/data';
import { LegendDisplayMode } from '@grafana/schema';
import { SimpleOptions } from './types';
import { SimplePanel } from './components';
import { ariaLabels } from './components/ariaLabels';

enum SensitivityMode {
  Low = 0,
  Medium = 1,
  High = 2
}

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel)
  .useFieldConfig({
    standardOptions: {
      color: {
        defaultValue: {
          mode: FieldColorModeId.ContinuousGrYlRd,
        },
      },
    },
  })
  .setPanelOptions((builder) => {
    return builder
      .addBooleanSwitch({
        path: 'anomalyDetection',
        name: 'Anomaly Detection',
        defaultValue: false,
      })
      .addRadio({
        path: 'sensitivityMode',
        name: 'Sensitivity',
        defaultValue: SensitivityMode.Low,
        settings: {
          options: [
            {
              label: 'Low',
              value: SensitivityMode.Low,
              description: 'Enable low sensitivity',
              ariaLabel: "Low sensitivity",
            },
            {
              label: 'Medium',
              value: SensitivityMode.Medium,
              description: 'Enable medium sensitivity',
              ariaLabel: "Medium sensitivity",
            },
            {
              label: 'High',
              value: SensitivityMode.High,
              description: 'Enable high sensitivity',
              ariaLabel: "High sensitivity",
            },
          ],
        },
      })
      .addRadio({
        path: 'legend.displayMode',
        name: 'Legend mode',
        category: ['Legend'],
        description: '',
        defaultValue: LegendDisplayMode.List,
        settings: {
          options: [
            {
              value: LegendDisplayMode.List,
              label: 'List',
              ariaLabel: ariaLabels.legendDisplayList,
            },
            {
              value: LegendDisplayMode.Table,
              label: 'Table',
              ariaLabel: ariaLabels.legendDisplayTable,
            },
            {
              value: undefined,
              label: 'Hidden',
              ariaLabel: ariaLabels.legendDisplayHidden,
            },
          ],
        },
      })
      .addRadio({
        path: 'legend.placement',
        name: 'Legend placement',
        category: ['Legend'],
        description: '',
        defaultValue: 'bottom',
        settings: {
          options: [
            {
              value: 'bottom',
              label: 'Bottom',
              ariaLabel: ariaLabels.legendPlacementBottom,
            },
            {
              value: 'right',
              label: 'Right',
              ariaLabel: ariaLabels.legendPlacementRight,
            },
          ],
        },
        showIf: (config) => !!config.legend.displayMode,
      });
  });
