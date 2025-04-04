/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { CloudProviderIcon } from '.';
import { CloudProvider } from './get_cloud_provider_icon';

export default {
  title: 'Custom Icons/CloudProviderIcon',
  component: CloudProviderIcon,
};

const providers: CloudProvider[] = ['gcp', 'aws', 'azure', 'unknownProvider'];

export const List: StoryFn = () => {
  return (
    <EuiFlexGroup gutterSize="l" wrap={true}>
      {providers.map((cloudProvider) => {
        return (
          <EuiFlexItem key={cloudProvider} grow={false}>
            <EuiCard
              title={cloudProvider as string}
              description={
                <EuiToolTip position="bottom" content="Icon rendered with `CloudProviderIcon`">
                  <CloudProviderIcon cloudProvider={cloudProvider} size="xxl" />
                </EuiToolTip>
              }
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
