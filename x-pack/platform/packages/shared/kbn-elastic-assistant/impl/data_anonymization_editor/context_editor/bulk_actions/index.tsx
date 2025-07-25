/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { getContextMenuPanels, PRIMARY_PANEL_ID } from '../get_context_menu_panels';
import * as i18n from '../translations';
import type { OnListUpdated } from '../../../assistant/settings/use_settings_updater/use_anonymization_updater';
import type { HandleRowChecked } from '../selection/types';

export interface Props {
  appliesTo: 'multipleRows' | 'singleRow';
  disabled: boolean;
  disableAllow?: boolean;
  disableAnonymize?: boolean;
  disableDeny?: boolean;
  disableUnanonymize?: boolean;
  onListUpdated: OnListUpdated;
  selectedField?: string; // Selected field for a single row, undefined if applies to multiple rows
  selectedFields: string[]; // Selected fields for the entire table
  handleRowChecked: HandleRowChecked;
}

const BulkActionsComponent: React.FC<Props> = ({
  appliesTo,
  disabled,
  disableAllow = false,
  disableAnonymize = false,
  disableDeny = false,
  disableUnanonymize = false,
  onListUpdated,
  selectedField,
  selectedFields,
  handleRowChecked,
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const contextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'contextEditorBulkActions',
  });

  const closePopover = useCallback(() => setPopover(false), []);

  const onButtonClick = useCallback(() => {
    setPopover((isOpen) => !isOpen);
  }, []);

  const button = useMemo(
    () => (
      <EuiToolTip content={appliesTo === 'multipleRows' ? undefined : i18n.ALL_ACTIONS}>
        <EuiButtonEmpty
          data-test-subj="bulkActionsButton"
          disabled={disabled}
          iconType={appliesTo === 'multipleRows' ? 'arrowDown' : 'boxesVertical'}
          iconSide={appliesTo === 'multipleRows' ? 'right' : undefined}
          onClick={onButtonClick}
          size="xs"
        >
          {appliesTo === 'multipleRows' ? i18n.BULK_ACTIONS : null}
        </EuiButtonEmpty>
      </EuiToolTip>
    ),
    [appliesTo, disabled, onButtonClick]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () =>
      getContextMenuPanels({
        disableAllow,
        disableAnonymize,
        disableDeny,
        disableUnanonymize,
        closePopover,
        onListUpdated,
        selectedField,
        selectedFields,
        handleRowChecked,
      }),
    [
      closePopover,
      disableAllow,
      disableAnonymize,
      disableDeny,
      disableUnanonymize,
      handleRowChecked,
      onListUpdated,
      selectedField,
      selectedFields,
    ]
  );

  return (
    <EuiPopover
      anchorPosition="downLeft"
      button={button}
      closePopover={closePopover}
      data-test-subj="bulkActions"
      id={contextMenuPopoverId}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={PRIMARY_PANEL_ID} panels={panels} size="s" />
    </EuiPopover>
  );
};

export const BulkActions = React.memo(BulkActionsComponent);
