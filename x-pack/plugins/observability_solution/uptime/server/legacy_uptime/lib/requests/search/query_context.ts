/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { ESFilter } from '@kbn/es-types';
import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { CursorPagination } from './types';
import { CursorDirection, SortOrder } from '../../../../../common/runtime_types';
import { UptimeEsClient } from '../../lib';
import { parseRelativeDate } from '../../../../../common/lib/get_histogram_interval';

export class QueryContext {
  callES: UptimeEsClient;
  dateRangeStart: string;
  dateRangeEnd: string;
  pagination: CursorPagination;
  filterClause: any | null;
  size: number;
  statusFilter?: string;
  query?: string;

  constructor(
    database: UptimeEsClient,
    dateRangeStart: string,
    dateRangeEnd: string,
    pagination: CursorPagination,
    filterClause: any | null,
    size: number,
    statusFilter?: string,
    query?: string
  ) {
    this.callES = database;
    this.dateRangeStart = dateRangeStart;
    this.dateRangeEnd = dateRangeEnd;
    this.pagination = pagination;
    this.filterClause = filterClause;
    this.size = size;
    this.statusFilter = statusFilter;
    this.query = query;
  }

  async search<TParams extends SearchRequest>(params: TParams, operationName?: string) {
    return this.callES.search(params, operationName);
  }

  async dateAndCustomFilters(): Promise<ESFilter[]> {
    const clauses = [await this.dateRangeFilter()];
    if (this.filterClause) {
      clauses.push(this.filterClause);
    }
    return clauses;
  }

  async dateRangeFilter(): Promise<any> {
    const timestampClause = {
      range: { '@timestamp': { gte: this.dateRangeStart, lte: this.dateRangeEnd } },
    };

    return {
      bool: {
        filter: [
          timestampClause,
          {
            bool: {
              should: [
                this.timespanClause(),
                {
                  bool: {
                    must_not: { exists: { field: 'monitor.timespan' } },
                  },
                },
              ],
            },
          },
        ],
      },
    };
  }

  // timeRangeClause queries the given date range using the monitor timespan field
  // which is a bit dicey since we may have data that predates this field existing,
  // or we may have data that has it, but a slow ingestion process.
  timespanClause() {
    // We subtract 20m from the start to account for data that shows up late,
    // for instance, with a large value for the elasticsearch refresh interval
    // setting it lower can work very well on someone's laptop, but with real world
    // latencies and slowdowns that's dangerous. Making this value larger makes things
    // only slower, but only marginally so, and prevents people from seeing weird
    // behavior.

    if (this.dateRangeEnd === 'now') {
      return {
        range: {
          'monitor.timespan': {
            gte: 'now-20m',
            lte: 'now',
          },
        },
      };
    }

    const tsEnd = parseRelativeDate(this.dateRangeEnd, { roundUp: true })!;
    const tsStart = moment(tsEnd).subtract(20, 'minutes');

    return {
      range: {
        'monitor.timespan': {
          gte: tsStart.toISOString(),
          lte: tsEnd.toISOString(),
        },
      },
    };
  }

  clone(): QueryContext {
    return new QueryContext(
      this.callES,
      this.dateRangeStart,
      this.dateRangeEnd,
      this.pagination,
      this.filterClause,
      this.size,
      this.statusFilter,
      this.query
    );
  }

  // Returns true if the order returned by the ES query matches the requested sort order.
  // This useful to determine if the results need to be reversed from their ES results order.
  // I.E. when navigating backwards using prevPagePagination (CursorDirection.Before) yet using a SortOrder.ASC.
  searchSortAligned(): boolean {
    if (this.pagination.cursorDirection === CursorDirection.AFTER) {
      return this.pagination.sortOrder === SortOrder.ASC;
    } else {
      return this.pagination.sortOrder === SortOrder.DESC;
    }
  }

  cursorOrder(): 'asc' | 'desc' {
    return CursorDirection[this.pagination.cursorDirection] === CursorDirection.AFTER
      ? 'asc'
      : 'desc';
  }
}
