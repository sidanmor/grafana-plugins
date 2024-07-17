import { seasonalityAlgo } from './seasonalityAlgo';

const Sensitivity = {
  Low: 0,
  Medium: 1,
  High: 2,
};

export const algo = {
  ZScore: function(series: any[], sensitivity: number){
    
    function anomaliesByZScore(values: any[], start: any, sensitivity: number) {
      const c = (sensitivity === Sensitivity.Low ? 4 : sensitivity === Sensitivity.Medium ? 3 : 2);
      const sum = values.reduce((acc: any, value: any) => acc + value, 0);
      const mean = sum / values.length;
      const squaredDifferences = values.map((value: number) => Math.pow(value - mean, 2));
      const variance = squaredDifferences.reduce((acc: any, value: any) => acc + value, 0) / values.length;
      const sigma = Math.sqrt(variance);
      const threshold = c * sigma;
      const isAnomaly = values.map((value: number) => Math.abs(value - mean) > threshold);
      return isAnomaly;
    }

    function isAnomalyConsecutive(isAnomaly: { [x: string]: any; }, start: any, consecutive: any) {
      for (let i = start; i < start + consecutive; i++) {
        if (!isAnomaly[i]) {
          return false;
        }
      }

      return true;
    }

    function areAnomalies(values: string | any[], startIndex: number, anomalyFunction: { (values: any, start: any, sensitivity: any): any; (arg0: any, arg1: number, arg2: any): any; }, sensitivity: number, consecutive: number) {
      values = values.slice(0, -1); // Remove the last point
      let isAnomaly = anomalyFunction(values, 0, sensitivity);
      for (let i = startIndex; i < isAnomaly.length - consecutive; i++) {
        if (isAnomalyConsecutive(isAnomaly, i, consecutive)) {
          return true;
        }
      }

      return false;
    }

    let anomalies = series.map((s: { fields: Array<{ values: string | any[]; }>; }) => ({ ...s, areAnomalies: areAnomalies(s.fields[1].values, Math.trunc(s.fields[1].values.length * (2 / 3)), anomaliesByZScore, sensitivity, 2) }));

    console.log("# ZScore: FilteredOut: " + anomalies.filter((a: { areAnomalies: any; }) => !a.areAnomalies).length);
    console.log("#anomalies: " + anomalies.map(a => a.areAnomalies));
    
    return anomalies.map(a => a.areAnomalies);
  },
  seasonalityAlgo: function(series: any[], sensitivity: number){
    
    let sliceIndex = Math.trunc(series[0].fields[1].values.length * (2 / 3));
    let anomalies = series.map((s) => ({ ...s, areAnomalies: seasonalityAlgo.checkIsAnomaly(s.fields[1].values.slice(0, sliceIndex), s.fields[1].values.slice(sliceIndex), sensitivity).is_anomaly }));

    console.log("# SeasonalityAlgo FilteredOut: " + anomalies.filter((a: { areAnomalies: any; }) => !a.areAnomalies).length);
    console.log("#anomalies: " + anomalies.map(a => a.areAnomalies));
    
    return anomalies.map(a => a.areAnomalies);
  },
  filterSeries : function (series: any[], anomalies: any[]) {
    let res = [];
    for (let i = 0; i < anomalies.length; i++) {
      if(anomalies[i]){
        res.push(series[i]);
      }
    }
    return res;
  }
};


