/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useLoadConnectors } from '@kbn/elastic-assistant';
import {
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ELASTIC_LLM_USAGE_COSTS,
  ELASTIC_LLM_THIRD_PARTY,
  ELASTIC_LLM_TOUR_PERFORMANCE,
} from '@kbn/elastic-assistant/impl/tour/elastic_llm/translations';
import { isElasticManagedLlmConnector } from '@kbn/elastic-assistant/impl/connectorland/helpers';
import {
  AuthorizationWrapper,
  MissingPrivilegesTooltip,
} from '../../../../../common/components/authorization';
import { useAuthorization } from '../../../../../common/hooks/use_authorization';
import { useKibana } from '../../../../../common/hooks/use_kibana';
import { StepContentWrapper } from '../step_content_wrapper';
import { ConnectorSelector } from './connector_selector';
import { ConnectorSetup } from './connector_setup';
import type { AIConnector } from '../../types';
import { useActions } from '../../state';
import * as i18n from './translations';

/**
 * List of allowed action type IDs for the integrations assistant.
 */
const AllowedActionTypeIds = ['.bedrock', '.gen-ai', '.gemini'];

const ElasticLLMNewIntegrationMessage = React.memo(() => {
  const {
    docLinks: {
      links: {
        securitySolution: {
          thirdPartyLlmProviders: THIRD_PARTY_LLM_LINK,
          llmPerformanceMatrix: LLM_PERFORMANCE_LINK,
        },
        observability: { elasticManagedLlmUsageCost: ELASTIC_LLM_USAGE_COST_LINK },
      },
    },
  } = useKibana().services;

  return (
    <FormattedMessage
      id="xpack.automaticImport.steps.connector.esLLM.supportedModelsInfo"
      defaultMessage="The Elastic Managed LLM connector is selected by default. Review its {usageCost} or {thirdParty}. Model {performance} varies by task."
      values={{
        usageCost: (
          <EuiLink
            href={ELASTIC_LLM_USAGE_COST_LINK}
            target="_blank"
            rel="noopener noreferrer"
            external
          >
            {ELASTIC_LLM_USAGE_COSTS}
          </EuiLink>
        ),
        thirdParty: (
          <EuiLink href={THIRD_PARTY_LLM_LINK} target="_blank" rel="noopener noreferrer" external>
            {ELASTIC_LLM_THIRD_PARTY}
          </EuiLink>
        ),
        performance: (
          <EuiLink href={LLM_PERFORMANCE_LINK} target="_blank" rel="noopener noreferrer" external>
            {ELASTIC_LLM_TOUR_PERFORMANCE}
          </EuiLink>
        ),
      }}
    />
  );
});
ElasticLLMNewIntegrationMessage.displayName = 'ElasticLLMNewIntegrationMessage';

interface ConnectorStepProps {
  connector: AIConnector | undefined;
}

export const ConnectorStep = React.memo<ConnectorStepProps>(({ connector }) => {
  const { euiTheme } = useEuiTheme();
  const { http, notifications, triggersActionsUi } = useKibana().services;
  const { setConnector, completeStep } = useActions();

  const [connectors, setConnectors] = useState<AIConnector[]>();
  let inferenceEnabled: boolean = false;

  if (triggersActionsUi.actionTypeRegistry.has('.inference')) {
    inferenceEnabled = triggersActionsUi.actionTypeRegistry.get('.inference') as unknown as boolean;
  }
  if (inferenceEnabled) {
    AllowedActionTypeIds.push('.inference');
  }
  const {
    isLoading,
    data: aiConnectors,
    refetch: refetchConnectors,
  } = useLoadConnectors({ http, toasts: notifications.toasts, inferenceEnabled });

  useEffect(() => {
    if (aiConnectors != null) {
      // filter out connectors, this is temporary until we add support for more models
      const filteredAiConnectors = aiConnectors.filter(({ actionTypeId }) =>
        AllowedActionTypeIds.includes(actionTypeId)
      );
      setConnectors(filteredAiConnectors);
      if (filteredAiConnectors && filteredAiConnectors.length === 1) {
        // pre-select the connector if there is only one
        setConnector(filteredAiConnectors[0]);
      }
    }
  }, [aiConnectors, setConnector]);

  const onConnectorSaved = useCallback(() => refetchConnectors(), [refetchConnectors]);

  const hasConnectors = !isLoading && connectors?.length;

  return (
    <EuiForm
      component="form"
      fullWidth
      onSubmit={(e) => {
        e.preventDefault();
        completeStep();
      }}
    >
      <StepContentWrapper
        title={i18n.TITLE}
        subtitle={i18n.DESCRIPTION}
        right={
          hasConnectors ? <CreateConnectorPopover onConnectorSaved={onConnectorSaved} /> : null
        }
      >
        <EuiFlexGroup direction="column" alignItems="stretch">
          <EuiFlexItem>
            {isLoading ? (
              <EuiLoadingSpinner />
            ) : (
              <>
                {hasConnectors ? (
                  <ConnectorSelector
                    connectors={connectors}
                    setConnector={setConnector}
                    selectedConnectorId={connector?.id}
                  />
                ) : (
                  <AuthorizationWrapper canCreateConnectors>
                    <ConnectorSetup
                      actionTypeIds={AllowedActionTypeIds}
                      onConnectorSaved={onConnectorSaved}
                    />
                  </AuthorizationWrapper>
                )}
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="row" gutterSize="xs" alignItems="flexStart">
          <EuiFlexItem grow={false} css={{ margin: euiTheme.size.xxs }}>
            <EuiText size="xs" color="subdued">
              <EuiIcon type="info" size="s" className="eui-alignTop" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {inferenceEnabled && isElasticManagedLlmConnector(connector) ? (
                <ElasticLLMNewIntegrationMessage />
              ) : (
                i18n.SUPPORTED_MODELS_INFO
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </StepContentWrapper>
    </EuiForm>
  );
});
ConnectorStep.displayName = 'ConnectorStep';

interface CreateConnectorPopoverProps {
  onConnectorSaved: () => void;
}
const CreateConnectorPopover = React.memo<CreateConnectorPopoverProps>(({ onConnectorSaved }) => {
  const { canCreateConnectors } = useAuthorization();
  const [isOpen, setIsPopoverOpen] = useState(false);
  const openPopover = useCallback(() => setIsPopoverOpen(true), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onConnectorSavedAndClose = useCallback(() => {
    onConnectorSaved();
    closePopover();
  }, [onConnectorSaved, closePopover]);

  if (!canCreateConnectors) {
    return (
      <MissingPrivilegesTooltip canCreateConnectors>
        <EuiLink data-test-subj="createConnectorPopoverButtonDisabled" disabled>
          {i18n.CREATE_CONNECTOR}
        </EuiLink>
      </MissingPrivilegesTooltip>
    );
  }
  return (
    <EuiPopover
      button={
        <EuiText size="s">
          <EuiLink data-test-subj="createConnectorPopoverButton" onClick={openPopover}>
            {i18n.CREATE_CONNECTOR}
          </EuiLink>
        </EuiText>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      data-test-subj="createConnectorPopover"
    >
      <ConnectorSetup
        actionTypeIds={AllowedActionTypeIds}
        onConnectorSaved={onConnectorSavedAndClose}
        onClose={closePopover}
        compressed
      />
    </EuiPopover>
  );
});
CreateConnectorPopover.displayName = 'CreateConnectorPopover';
