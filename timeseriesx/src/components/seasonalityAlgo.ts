import * as ss from 'simple-statistics'
import * as percentile from 'percentile'
import { IsolationForest } from 'isolation-forest'

// anomaly consts
let MAXIMAl_PERCENT_OF_NULLS = 0.9
let MINIMAL_NUMBER_NON_NULL_VALS = 10
// low deviation consts 
let MINIMAL_WIDTH = 0.2;
let MINIMAL_WIDTH_VALS_GREATER_THAN_1 = 2;
let MEDIAN_ADJUSTMENT = 1;
let BASE_VALUE_FACTOR = 0.04;
// seasonality consts 
let AUTO_CORRELATION_THRESHOLD_FOR_SEASONALITY = 0.8
let MAX_VALUE = 1

function autocorrelation(lag: number, data: any[]) {
  let n = data.length;
  let mean = data.reduce((acc, value) => acc + value, 0) / n;

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let t = lag; t < n; t++) {
    numerator += (data[t] - mean) * (data[t - lag] - mean);
    denominator1 += Math.pow(data[t] - mean, 2);
    denominator2 += Math.pow(data[t - lag] - mean, 2);
  }
  // In case something goes wrong in the calculation
  if (numerator < 1 || denominator1 === 0 || denominator2 === 0)
  {
    return 0
  }
  return numerator / Math.sqrt(denominator1 * denominator2);

}

function isNullPercentageGreaterThan(data: any[], ratio: number) {
    // Count the number of null values in the array.
    const nullCount = data.filter((value) => value === null).length;
  
    // Calculate the total number of elements in the array.
    const totalCount = data.length;
  
    // Calculate the percentage of null values.
    const nullPercentage = (nullCount / totalCount) * 100;
  
    // Check if the null percentage is greater than the specified ratio.
    return nullPercentage > ratio;
  }
  
function computeMinDeviation(x: any) {
    let median = ss.median(x);
    let minimalAbsoluteWidthForModel = MINIMAL_WIDTH;
    
    if (Math.max(...x) > MAX_VALUE) {
      minimalAbsoluteWidthForModel = MINIMAL_WIDTH_VALS_GREATER_THAN_1;
    }
  
    let absMedian = Math.abs(median);
    let adjustedBaseValue = absMedian + (MEDIAN_ADJUSTMENT / (MEDIAN_ADJUSTMENT + absMedian));
    let minDeviation = adjustedBaseValue * BASE_VALUE_FACTOR;
  
    return Math.max(minDeviation, minimalAbsoluteWidthForModel);
  }

function checkLowDeviation(data: any){
    const p_res: any[] = percentile.default([90,10],data);
    const p_10 = p_res[1];
    const p_90 = p_res[0];
    const ipr = p_90 - p_10
    const min_div = computeMinDeviation(data)
    if (ipr < min_div){
        return true
    }
    return false
}

function adapt_for_iso_forest(data: any[]){
    let transformedData = data.map((value, index) => ({
        timestamp:index,
        value: value,
      }));
    return transformedData
}

function find_seasonality(data: any[]){
    let maxLag = 48; // Figure this value out according to data size 
    let autocorrelationValues = [];
    for (let lag = 1; lag <= maxLag; lag++) {
      let ac = autocorrelation(lag,data);
      autocorrelationValues.push(ac);
    }
    let maxAutocorrelation = Math.max(...autocorrelationValues);
    let highestAutocorrelationLag = autocorrelationValues.indexOf(maxAutocorrelation) + 1;
    return {
        lag: highestAutocorrelationLag,
        autocorrelation: maxAutocorrelation,
      }
    }

function computeIsolationTreeScores(historical_data: any[], anomaly_data: any[]){
        // create Isolation Forest
        const numberOfTrees=100;
        let iso_f = new IsolationForest(numberOfTrees);
        // adapt array for Isolation Forest package
        const adapted_historical_data = adapt_for_iso_forest(historical_data)
        const adapted_anomaly_data = adapt_for_iso_forest(anomaly_data)
        iso_f.fit(adapted_historical_data)
        return iso_f.predict(adapted_anomaly_data)
}

function extractSeasonalPatternAndRemoveFromAnomalyData(historical_data: string | any[], anomaly_data: string | any[], seasonalityLag: number) {
    let anomalyDataWithoutSeasonalPattern = [];  
    for (let i = 0; i < anomaly_data.length; i++) {
        // get the value "seasonality lag" back in historical data
        let dataToRemove;
        if(i<seasonalityLag)
        {
            dataToRemove = historical_data[historical_data.length - seasonalityLag + i]
        }
        else
        {
            dataToRemove = anomaly_data[i - seasonalityLag]
        }
  
        // Calculate the anomaly data with the seasonal pattern removed.
        let anomalyDataWithoutSeasonal = anomaly_data[i] - dataToRemove;
        anomalyDataWithoutSeasonalPattern.push(anomalyDataWithoutSeasonal);
    }
    
    let historicalDataWithoutSeasonalPattern = [];  

    for (let i = seasonalityLag; i < historical_data.length; i++) {
        // Calculate the index of the corresponding data point in a previous season.
        let prevSeasonIndex = i - seasonalityLag;
    
        // If the index is negative, wrap around to the end of the data array.
        const dataIndex: number = prevSeasonIndex < 0 ? prevSeasonIndex + historicalDataWithoutSeasonalPattern.length : prevSeasonIndex;
    
        // Extract the seasonal component for the current data point.
        let seasonalValue: number = historical_data[dataIndex];
        
        // Calculate the historical data with the seasonal pattern removed.
        let historicalDataWithoutSeasonal = historical_data[i] - seasonalValue;
        historicalDataWithoutSeasonalPattern.push(historicalDataWithoutSeasonal);
    }
    return { 'historicalDataWithoutSeasonalPattern':historicalDataWithoutSeasonalPattern,
         'anomalyDataWithoutSeasonalPattern':anomalyDataWithoutSeasonalPattern };
  }

function areAllValuesSame(data: any[]) {
    return data.every((value, index, array) => value === array[0]);
  }

function computeAnomlyScores(historical_data: any[], anomaly_data: any[]){
    let isLowDeviation = false;
    const result = {
        isLowDeviation: isLowDeviation,
        anomaly_scores: Array.from({ length: anomaly_data.length }, () => 0),
    }
    // Check if time series is eligible for anomaly detection.
    if (isNullPercentageGreaterThan(historical_data, MAXIMAl_PERCENT_OF_NULLS ) || (areAllValuesSame(historical_data)) || (historical_data.filter((value) => value !== null).length < MINIMAL_NUMBER_NON_NULL_VALS)){
        return result
    }
    // if low deviation compute Isolation trees
    if (checkLowDeviation(historical_data)){
        result.isLowDeviation = true
    }
    // if not low deviation look for seasonality
    const seasonality_res = find_seasonality(historical_data);
    const seasonality_lag = seasonality_res.lag;
    const seasonality_autocorrelation = seasonality_res.autocorrelation;
    if (seasonality_autocorrelation < AUTO_CORRELATION_THRESHOLD_FOR_SEASONALITY){
        // No seasonality
        result.anomaly_scores = computeIsolationTreeScores(historical_data, anomaly_data);
        return result;
    }
    // Seasonality found
    const non_seasonal_data = extractSeasonalPatternAndRemoveFromAnomalyData(historical_data, anomaly_data, seasonality_lag);
    result.anomaly_scores = computeIsolationTreeScores(non_seasonal_data.historicalDataWithoutSeasonalPattern, non_seasonal_data.anomalyDataWithoutSeasonalPattern);
    return result
}

let checkIsAnomaly = function checkIsAnomaly(historical_data: any[], anomaly_data: any[], deviation: number) {
  
    // Calculate anomaly scores (you should implement computeAnomlyScores function).
    let anomaly_results = computeAnomlyScores(historical_data, anomaly_data);

    // Map deviation to corresponding threshold values.
    let threshold: number;
    let deviationThresholds;
    let defaultDev;
    if(anomaly_results.isLowDeviation)
    {
        deviationThresholds = { 1: 0.6, 2: 0.6, 3: 0.55 };
        defaultDev = 0.85; // Default to 0.85 if deviation is not in the mapping.
    }
    else
    {
        deviationThresholds = { 1: 0.57, 2: 0.54, 3: 0.5 };
        defaultDev = 0.8; // Default to 0.8 if deviation is not in the mapping.
    }

    threshold = deviationThresholds[deviation] || defaultDev;

    let anomaly_scores = anomaly_results.anomaly_scores

    // Check if any of the anomaly scores exceed the threshold.
    let is_anomaly = anomaly_scores.some((score) => score > threshold)
  
    // Find the indexes of anomalies (where scores exceed the threshold).
    const anomalies = anomaly_scores.map(as => as > threshold);
    
    let anomalyIndexes = [];
    for (let i = 0; i < anomalies.length; i++) {
      if(anomalies[i]){
        anomalyIndexes.push(i);
      }
    }

    return {
      is_anomaly: is_anomaly,
      anomalyIndexes: anomalyIndexes,
    };
  }

export const seasonalityAlgo = {
  checkIsAnomaly
}
