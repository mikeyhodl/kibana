/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { UseField, TextField, ToggleField } from '../../shared_imports';
import { IndexPatternConfig } from '../../types';

import { AdvancedParamsSection } from './advanced_params_section';

const allowHiddenAriaLabel = i18n.translate('indexPatternEditor.form.allowHiddenAriaLabel', {
  defaultMessage: 'Allow hidden and system indices',
});

const customIndexPatternIdLabel = i18n.translate(
  'indexPatternEditor.form.customIndexPatternIdLabel',
  {
    defaultMessage: 'Custom data view ID',
  }
);

interface AdvancedParamsContentProps {
  disableAllowHidden: boolean;
  disableId: boolean;
  onAllowHiddenChange?: (value: boolean) => void;
  defaultVisible?: boolean;
}

export const AdvancedParamsContent = ({
  disableAllowHidden,
  disableId,
  onAllowHiddenChange,
  defaultVisible = false,
}: AdvancedParamsContentProps) => (
  <AdvancedParamsSection defaultVisible={defaultVisible}>
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField<boolean, IndexPatternConfig>
          path={'allowHidden'}
          component={ToggleField}
          data-test-subj="allowHiddenField"
          componentProps={{
            euiFieldProps: {
              'aria-label': allowHiddenAriaLabel,
              disabled: disableAllowHidden,
            },
          }}
          onChange={onAllowHiddenChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="m" />
    <EuiFlexGroup>
      <EuiFlexItem>
        <UseField<string, IndexPatternConfig>
          path={'id'}
          component={TextField}
          data-test-subj="savedObjectIdField"
          componentProps={{
            euiFieldProps: {
              'aria-label': customIndexPatternIdLabel,
              disabled: disableId,
            },
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </AdvancedParamsSection>
);
