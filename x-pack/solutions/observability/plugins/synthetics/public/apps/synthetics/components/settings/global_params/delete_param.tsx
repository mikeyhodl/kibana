/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDispatch, useSelector } from 'react-redux';
import {
  getGlobalParamAction,
  deleteGlobalParamsAction,
  selectGlobalParamState,
} from '../../../state/global_params';
import { NO_LABEL, YES_LABEL } from '../../monitors_page/management/monitor_list_table/labels';
import { ListParamItem } from './params_list';

export const DeleteParam = ({
  items,
  setIsDeleteModalVisible,
}: {
  items: ListParamItem[];
  setIsDeleteModalVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const dispatch = useDispatch();
  const { isDeleting, listOfParams } = useSelector(selectGlobalParamState);

  const name = items
    .map(({ key }) => key)
    .join(', ')
    .slice(0, 50);

  useEffect(() => {
    if (!isDeleting && (listOfParams ?? []).length === 0) {
      setIsDeleteModalVisible(false);
      dispatch(getGlobalParamAction.get());
    }
  }, [isDeleting, setIsDeleteModalVisible, name, dispatch, listOfParams]);

  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={i18n.translate('xpack.synthetics.paramManagement.deleteParamNameLabel', {
        defaultMessage: 'Delete "{name}" param?',
        values: { name },
      })}
      titleProps={{ id: modalTitleId }}
      onCancel={() => setIsDeleteModalVisible(false)}
      onConfirm={() => {
        dispatch(deleteGlobalParamsAction.get(items.map(({ id }) => id)));
      }}
      cancelButtonText={NO_LABEL}
      confirmButtonText={YES_LABEL}
      buttonColor="danger"
      defaultFocusedButton="confirm"
      isLoading={isDeleting}
    />
  );
};
