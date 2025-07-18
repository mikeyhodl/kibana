/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

const criteriaFieldSchema = schema.object({
  fieldType: schema.maybe(schema.string()),
  fieldName: schema.string(),
  fieldValue: schema.any(),
});

const severityThresholdSchema = schema.object({
  min: schema.number(),
  max: schema.maybe(schema.number()),
});

export const anomaliesTableDataSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  influencers: schema.arrayOf(
    schema.maybe(schema.object({ fieldName: schema.string(), fieldValue: schema.any() }))
  ),
  aggregationInterval: schema.string(),
  threshold: schema.arrayOf(severityThresholdSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  dateFormatTz: schema.string(),
  maxRecords: schema.number(),
  maxExamples: schema.maybe(schema.number()),
  influencersFilterQuery: schema.maybe(schema.any()),
  functionDescription: schema.maybe(schema.nullable(schema.string())),
});

export const categoryDefinitionSchema = schema.object({
  jobId: schema.maybe(schema.string()),
  categoryId: schema.string(),
});

export const maxAnomalyScoreSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  earliestMs: schema.maybe(schema.number()),
  latestMs: schema.maybe(schema.number()),
});

export const categoryExamplesSchema = schema.object({
  jobId: schema.string(),
  categoryIds: schema.arrayOf(schema.string()),
  maxExamples: schema.number(),
});

export const anomalySearchSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  query: schema.any(),
});

const fieldConfig = schema.maybe(
  schema.object({
    applyTimeRange: schema.maybe(schema.boolean()),
    anomalousOnly: schema.maybe(schema.boolean()),
    sort: schema.object({
      by: schema.string(),
      order: schema.maybe(schema.string()),
    }),
    value: schema.maybe(schema.string()),
  })
);

export const partitionFieldValuesSchema = schema.object({
  jobId: schema.string(),
  searchTerm: schema.maybe(schema.any()),
  criteriaFields: schema.arrayOf(criteriaFieldSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  fieldsConfig: schema.maybe(
    schema.object({
      partition_field: fieldConfig,
      over_field: fieldConfig,
      by_field: fieldConfig,
    })
  ),
});

export type FieldsConfig = TypeOf<typeof partitionFieldValuesSchema>['fieldsConfig'];
export type FieldConfig = TypeOf<typeof fieldConfig>;

export const getCategorizerStatsSchema = schema.object({
  partitionByValue: schema.maybe(
    schema.string({
      meta: {
        description:
          'Optional value to fetch the categorizer stats where results are filtered by partition_by_value = value',
      },
    })
  ),
});

export const getCategorizerStoppedPartitionsSchema = schema.object({
  jobIds: schema.arrayOf(schema.string(), {
    meta: { description: 'List of jobIds to fetch the categorizer partitions for' },
  }),
  fieldToBucket: schema.maybe(
    schema.string({
      meta: {
        description: `Field to aggregate results by: 'job_id' or 'partition_field_value'. If by job_id, will return list of jobIds with at least one partition that have stopped. If by partition_field_value, it will return a list of categorizer stopped partitions for each job_id`,
      },
    })
  ),
});

export const getDatafeedResultsChartDataSchema = schema.object({
  jobId: schema.string({ meta: { description: 'Job id to fetch the bucket results for' } }),
  start: schema.number(),
  end: schema.number(),
});

export const getAnomalyChartsSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  influencers: schema.arrayOf(schema.any()),
  threshold: schema.arrayOf(severityThresholdSchema),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  maxResults: schema.number({
    defaultValue: 6,
    min: 1,
    max: 50,
    meta: { description: 'Maximum amount of series data' },
  }),
  influencersFilterQuery: schema.maybe(schema.any()),
  numberOfPoints: schema.number({
    meta: { description: 'Optimal number of data points per chart' },
  }),
  timeBounds: schema.object({
    min: schema.maybe(schema.number()),
    max: schema.maybe(schema.number()),
  }),
});

export const getAnomalyRecordsSchema = schema.object({
  jobIds: schema.arrayOf(schema.string()),
  threshold: schema.number({ defaultValue: 0, min: 0, max: 99 }),
  earliestMs: schema.number(),
  latestMs: schema.number(),
  criteriaFields: schema.arrayOf(schema.any()),
  interval: schema.string(),
  functionDescription: schema.maybe(schema.nullable(schema.string())),
});
