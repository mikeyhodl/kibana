/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ApmSynthtraceEsClient,
  EntitiesSynthtraceEsClient,
  LogLevel,
  createLogger,
  InfraSynthtraceEsClient,
  LogsSynthtraceEsClient,
} from '@kbn/apm-synthtrace';
import { createEsClientForTesting } from '@kbn/test';
// eslint-disable-next-line @kbn/imports/no_unresolvable_imports
import { initPlugin } from '@frsource/cypress-plugin-visual-regression-diff/plugins';
import del from 'del';
import { some } from 'lodash';
import { Readable } from 'stream';

export function setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  const logger = createLogger(LogLevel.info);

  const client = createEsClientForTesting({
    esUrl: config.env.ES_NODE,
    requestTimeout: config.env.ES_REQUEST_TIMEOUT,
    isCloud: !!config.env.TEST_CLOUD,
  });

  const entitiesSynthtraceEsClient = new EntitiesSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
    pipeline: {
      includeSerialization: false,
    },
  });

  const apmSynthtraceEsClient = new ApmSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
    version: config.env.APM_PACKAGE_VERSION,
    pipeline: {
      includeSerialization: false,
    },
  });

  const logsSynthtraceEsClient = new LogsSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
    pipeline: {
      includeSerialization: false,
    },
  });

  const infraSynthtraceEsClient = new InfraSynthtraceEsClient({
    client,
    logger,
    refreshAfterIndex: true,
    pipeline: {
      includeSerialization: false,
    },
  });

  initPlugin(on, config);

  on('task', {
    // send logs to node process
    log(message) {
      // eslint-disable-next-line no-console
      console.log(message);
      return null;
    },

    async 'entitiesSynthtrace:index'(events: Array<Record<string, any>>) {
      await entitiesSynthtraceEsClient.index(Readable.from(events));
      return null;
    },

    async 'entitiesSynthtrace:clean'() {
      await entitiesSynthtraceEsClient.clean();
      return null;
    },

    async 'apmSynthtrace:index'(events: Array<Record<string, any>>) {
      await apmSynthtraceEsClient.index(Readable.from(events));
      return null;
    },
    async 'apmSynthtrace:clean'() {
      await apmSynthtraceEsClient.clean();
      return null;
    },
    async 'logsSynthtrace:index'(events: Array<Record<string, any>>) {
      await logsSynthtraceEsClient.index(Readable.from(events));
      return null;
    },
    async 'logsSynthtrace:clean'() {
      await logsSynthtraceEsClient.clean();
      return null;
    },
    async 'infraSynthtrace:index'(events: Array<Record<string, any>>) {
      await infraSynthtraceEsClient.index(Readable.from(events));
      return null;
    },
    async 'infraSynthtrace:clean'() {
      await infraSynthtraceEsClient.clean();
      return null;
    },
  });

  on('after:spec', (spec, results) => {
    // Delete videos that have no failures or retries
    if (results && results.video) {
      const failures = some(results.tests, (test) => {
        return some(test.attempts, { state: 'failed' });
      });
      if (!failures) {
        del(results.video);
      }
    }
  });

  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'electron' && browser.isHeadless) {
      launchOptions.preferences.width = 1440;
      launchOptions.preferences.height = 1600;
    }
    return launchOptions;
  });
}
