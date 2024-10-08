/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/core/server';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetchProvider } from './fetch';

export interface ReportedUsage {
  transientCount: number;
  persistedCount: number;
  totalCount: number;
}

export function registerUsageCollector(
  usageCollection: UsageCollectionSetup,
  getIndexForType: (type: string) => Promise<string>,
  logger: Logger
) {
  try {
    const collector = usageCollection.makeUsageCollector<ReportedUsage>({
      type: 'search-session',
      isReady: () => true,
      fetch: fetchProvider(getIndexForType, logger),
      schema: {
        transientCount: { type: 'long' },
        persistedCount: { type: 'long' },
        totalCount: { type: 'long' },
      },
    });
    usageCollection.registerCollector(collector);
  } catch (err) {
    return; // kibana plugin is not enabled (test environment)
  }
}
