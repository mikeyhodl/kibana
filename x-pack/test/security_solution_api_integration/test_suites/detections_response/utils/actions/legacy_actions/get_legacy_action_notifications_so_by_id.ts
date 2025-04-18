/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { SavedObjectReference } from '@kbn/core/server';
import { LegacyRuleNotificationRuleTypeParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_actions_legacy';

interface LegacyActionNotificationSO extends LegacyRuleNotificationRuleTypeParams {
  references: SavedObjectReference[];
}

/**
 * Fetch legacy action sidecar notification SOs from the alerting savedObjects index
 * @param es The ElasticSearch service
 * @param id SO id
 */
export const getLegacyActionNotificationSOById = async (
  es: Client,
  id: string
): Promise<SearchResponse<LegacyActionNotificationSO>> =>
  es.search({
    index: ALERTING_CASES_SAVED_OBJECT_INDEX,
    q: `alert.alertTypeId:siem.notifications AND alert.params.ruleAlertId:"${id}"`,
  });
