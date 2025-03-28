/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DARK_THEME, Settings } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { EMPTY_STAT } from '../../../constants';
import { alertIndexWithAllResults } from '../../../mock/pattern_rollup/mock_alerts_pattern_rollup';
import { auditbeatWithAllResults } from '../../../mock/pattern_rollup/mock_auditbeat_pattern_rollup';
import { packetbeatNoResults } from '../../../mock/pattern_rollup/mock_packetbeat_pattern_rollup';
import {
  TestDataQualityProviders,
  TestExternalProviders,
} from '../../../mock/test_providers/test_providers';
import type { Props } from '.';
import { StorageTreemap } from '.';
import { NO_DATA_LABEL } from './translations';
import { PatternRollup } from '../../../types';
import { FlattenedBucket } from '../types';
import { getFlattenedBuckets } from '../utils/get_flattened_buckets';
import { getLegendItems } from './utils/get_legend_items';
import { DEFAULT_MAX_CHART_HEIGHT } from '..';

const defaultBytesFormat = '0,0.[0]b';
const formatBytes = (value: number | undefined) =>
  value != null ? numeral(value).format(defaultBytesFormat) : EMPTY_STAT;

const ilmPhases = ['hot', 'warm', 'unmanaged'];
const patterns = ['.alerts-security.alerts-default', 'auditbeat-*', 'packetbeat-*'];

const patternRollups: Record<string, PatternRollup> = {
  '.alerts-security.alerts-default': alertIndexWithAllResults,
  'auditbeat-*': auditbeatWithAllResults,
  'packetbeat-*': packetbeatNoResults,
};

const flattenedBuckets = getFlattenedBuckets({
  ilmPhases,
  isILMAvailable: true,
  patternRollups,
});

const onIndexSelected = jest.fn();

const defaultProps: Props = {
  accessor: 'sizeInBytes',
  flattenedBuckets,
  maxChartHeight: DEFAULT_MAX_CHART_HEIGHT,
  onIndexSelected,
  patternRollups,
  valueFormatter: formatBytes,
};

jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    Settings: jest.fn().mockReturnValue(null),
  };
});

const successColor = 'test-success-color';
const dangerColor = 'test-danger-color';
const primaryColor = 'test-primary-color';

describe('StorageTreemap', () => {
  describe('when data is provided', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ patterns, baseTheme: DARK_THEME }}>
            <StorageTreemap {...defaultProps} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    test('it renders the treemap', () => {
      expect(screen.getByTestId('storageTreemap').querySelector('.echChart')).toBeInTheDocument();
    });

    test('it renders the legend with the expected overflow-y style', () => {
      expect(screen.getByTestId('legend')).toHaveClass('eui-scrollBar');
    });

    test('it uses a theme with the expected `minFontSize` to show more labels at various screen resolutions', () => {
      expect((Settings as jest.Mock).mock.calls[0][0].theme[0].partition.minFontSize).toEqual(4);
    });

    describe('legend items', () => {
      const allLegendItems = getLegendItems({
        patterns,
        flattenedBuckets,
        patternRollups,
        successColor,
        dangerColor,
        primaryColor,
      });

      describe('pattern legend items', () => {
        const justPatterns = allLegendItems.filter((x) => x.ilmPhase == null);

        justPatterns.forEach(({ ilmPhase, index, pattern, sizeInBytes }) => {
          test(`it renders the expend legend item for pattern: ilmPhase ${ilmPhase} pattern ${pattern} index ${index}`, () => {
            expect(
              screen.getByTestId(`chart-legend-item-${ilmPhase}${pattern}${index}`)
            ).toHaveTextContent(`${pattern}${formatBytes(sizeInBytes)}`);
          });
        });
      });

      describe('index legend items', () => {
        const justIndices = allLegendItems.filter((x) => x.ilmPhase != null);

        justIndices.forEach(({ ilmPhase, index, pattern, sizeInBytes }) => {
          test(`it renders the expend legend item for index: ilmPhase ${ilmPhase} pattern ${pattern} index ${index}`, () => {
            expect(
              screen.getByTestId(`chart-legend-item-${ilmPhase}${pattern}${index}`)
            ).toHaveTextContent(`${index}${formatBytes(sizeInBytes)}`);
          });

          test(`it invokes onIndexSelected() with the expected values for ilmPhase ${ilmPhase} pattern ${pattern} index ${index}`, async () => {
            const legendItem = screen.getByTestId(
              `chart-legend-item-${ilmPhase}${pattern}${index}`
            );

            await userEvent.click(legendItem);

            expect(onIndexSelected).toBeCalledWith({ indexName: index, pattern });
          });
        });
      });
    });
  });

  describe('when the response does NOT have data', () => {
    const emptyFlattenedBuckets: FlattenedBucket[] = [];

    beforeEach(() => {
      render(
        <TestExternalProviders>
          <TestDataQualityProviders dataQualityContextProps={{ patterns, baseTheme: DARK_THEME }}>
            <StorageTreemap {...defaultProps} flattenedBuckets={emptyFlattenedBuckets} />
          </TestDataQualityProviders>
        </TestExternalProviders>
      );
    });

    test('it does NOT render the treemap', () => {
      expect(screen.queryByTestId('storageTreemap')).not.toBeInTheDocument();
    });

    test('it does NOT render the legend', () => {
      expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
    });

    test('it renders the "no data" message', () => {
      expect(screen.getByText(NO_DATA_LABEL)).toBeInTheDocument();
    });
  });
});
