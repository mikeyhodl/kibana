/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import { EmbeddableRegistryDefinition } from '@kbn/embeddable-plugin/server';
import {
  createExtract,
  createInject,
} from '../dashboard_saved_object/migrations/migrate_extract_panel_references/dashboard_container_references';

export const dashboardPersistableStateServiceFactory = (
  persistableStateService: EmbeddablePersistableStateService
): EmbeddableRegistryDefinition => {
  return {
    id: 'dashboard',
    extract: createExtract(persistableStateService),
    inject: createInject(persistableStateService),
  };
};
