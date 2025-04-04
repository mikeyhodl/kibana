/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { WorkflowInsights } from './components/insights/workflow_insights';
import { isPolicyOutOfDate } from '../../utils';
import { AgentStatus } from '../../../../../common/components/endpoint/agents/agent_status';
import type { HostInfo } from '../../../../../../common/endpoint/types';
import { useEndpointSelector } from '../hooks';
import { nonExistingPolicies, uiQueryParams } from '../../store/selectors';
import { POLICY_STATUS_TO_BADGE_COLOR } from '../host_constants';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useNavigateByRouterEventHandler } from '../../../../../common/hooks/endpoint/use_navigate_by_router_event_handler';
import { getEndpointDetailsPath } from '../../../../common/routing';
import { EndpointPolicyLink } from '../../../../components/endpoint_policy_link';

const ColumnTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiText size="s">
      <h5>{children}</h5>
    </EuiText>
  );
};

interface EndpointDetailsContentProps {
  hostInfo: HostInfo;
  policyInfo?: HostInfo['policy_info'];
}

export const EndpointDetailsContent = memo<EndpointDetailsContentProps>(
  ({ hostInfo, policyInfo }) => {
    // Access control
    const isWorkflowInsightsFeatureFlagEnabled = useIsExperimentalFeatureEnabled('defendInsights');
    const { canReadWorkflowInsights } = useUserPrivileges().endpointPrivileges;
    const canAccessWorkflowInsights = useMemo(() => {
      if (!isWorkflowInsightsFeatureFlagEnabled) {
        return false;
      }
      return canReadWorkflowInsights;
    }, [canReadWorkflowInsights, isWorkflowInsightsFeatureFlagEnabled]);

    const queryParams = useEndpointSelector(uiQueryParams);
    const policyStatus = useMemo(
      () => hostInfo.metadata.Endpoint.policy.applied.status,
      [hostInfo]
    );
    const missingPolicies = useEndpointSelector(nonExistingPolicies);

    const policyResponseRoutePath = useMemo(() => {
      const { selected_endpoint: selectedEndpoint, show, ...currentUrlParams } = queryParams;
      return getEndpointDetailsPath({
        name: 'endpointPolicyResponse',
        ...currentUrlParams,
        selected_endpoint: hostInfo.metadata.agent.id,
      });
    }, [hostInfo.metadata.agent.id, queryParams]);

    const policyStatusClickHandler = useNavigateByRouterEventHandler(policyResponseRoutePath);

    const detailsResults = useMemo(() => {
      return [
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.os"
                defaultMessage="OS"
              />
            </ColumnTitle>
          ),
          description: <EuiText size="xs">{hostInfo.metadata.host.os.full}</EuiText>,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.agentStatus"
                defaultMessage="Agent Status"
              />
            </ColumnTitle>
          ),
          description: <AgentStatus agentId={hostInfo.metadata.agent.id} agentType="endpoint" />,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.lastSeen"
                defaultMessage="Last Seen"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiText size="xs">
              <FormattedDate
                value={hostInfo.last_checkin || hostInfo.metadata['@timestamp']}
                fieldName=""
              />
            </EuiText>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.policy"
                defaultMessage="Policy"
              />
            </ColumnTitle>
          ),
          description: (
            <EndpointPolicyLink
              policyId={hostInfo.metadata.Endpoint.policy.applied.id}
              revision={hostInfo.metadata.Endpoint.policy.applied.endpoint_policy_version}
              isOutdated={isPolicyOutOfDate(hostInfo.metadata.Endpoint.policy.applied, policyInfo)}
              policyExists={!missingPolicies.has(hostInfo.metadata.Endpoint.policy.applied.id)}
              data-test-subj="policyDetailsValue"
            >
              {hostInfo.metadata.Endpoint.policy.applied.name}
            </EndpointPolicyLink>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.policyStatus"
                defaultMessage="Policy Status"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiHealth
              data-test-subj={`policyStatusValue-${policyStatus}`}
              color={POLICY_STATUS_TO_BADGE_COLOR[policyStatus] || 'default'}
            >
              <EuiLink onClick={policyStatusClickHandler} data-test-subj="policyStatusValue">
                <EuiText size="xs">
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.details.policyStatusValue"
                    defaultMessage="{policyStatus, select, success {Success} warning {Warning} failure {Failed} other {Unknown}}"
                    values={{ policyStatus }}
                  />
                </EuiText>
              </EuiLink>
            </EuiHealth>
          ),
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.endpointVersion"
                defaultMessage="Endpoint Version"
              />
            </ColumnTitle>
          ),
          description: <EuiText size="xs">{hostInfo.metadata.agent.version}</EuiText>,
        },
        {
          title: (
            <ColumnTitle>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.details.ipAddress"
                defaultMessage="IP Address"
              />
            </ColumnTitle>
          ),
          description: (
            <EuiFlexGroup direction="column" gutterSize="s">
              {hostInfo.metadata.host.ip.map((ip: string, index: number) => (
                <EuiFlexItem key={index}>
                  <EuiText size="xs">{ip}</EuiText>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ),
        },
      ];
    }, [hostInfo, policyInfo, missingPolicies, policyStatus, policyStatusClickHandler]);
    return (
      <div>
        {canAccessWorkflowInsights && <WorkflowInsights endpointId={hostInfo.metadata.agent.id} />}
        <EuiDescriptionList
          columnWidths={[1, 3]}
          compressed
          rowGutterSize="m"
          type="column"
          listItems={detailsResults}
          data-test-subj="endpointDetailsList"
        />
      </div>
    );
  }
);

EndpointDetailsContent.displayName = 'EndpointDetailsContent';
