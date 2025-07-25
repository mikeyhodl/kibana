/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { InventoryItemType, SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import type {
  InfraTimerangeInput,
  SnapshotCustomMetricInput,
} from '../../../../../common/http_api';
import { isMetricRate, isCustomMetricRate, isInterfaceRateAgg } from './is_rate';
import { createRateAggs } from './create_rate_aggs';
import { createLogRateAggs } from './create_log_rate_aggs';
import { createRateAggsWithInterface } from './create_rate_agg_with_interface';

export const createMetricAggregations = async (
  timerange: InfraTimerangeInput,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  customMetric?: SnapshotCustomMetricInput
) => {
  const inventoryModel = findInventoryModel(nodeType);
  if (customMetric && customMetric.field) {
    if (isCustomMetricRate(customMetric)) {
      return createRateAggs(timerange, customMetric.id, customMetric.field);
    }
    return {
      [customMetric.id]: {
        [customMetric.aggregation]: {
          field: customMetric.field,
        },
      },
    };
  } else if (metric === 'logRate') {
    return createLogRateAggs(timerange, metric);
  } else {
    const aggregations = await inventoryModel.metrics.getAggregations();
    const metricAgg = aggregations.get(metric);

    if (isInterfaceRateAgg(metricAgg)) {
      const field = get(
        metricAgg,
        `${metric}_interfaces.aggregations.${metric}_interface_max.max.field`
      ) as unknown as string;
      const interfaceField = get(
        metricAgg,
        `${metric}_interfaces.terms.field`
      ) as unknown as string;
      return createRateAggsWithInterface(timerange, metric, field, interfaceField);
    }
    if (isMetricRate(metricAgg)) {
      const field = get(metricAgg, `${metric}_max.max.field`) as unknown as string;
      return createRateAggs(timerange, metric, field);
    }
    return metricAgg;
  }
};
