/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createClient } from './create_client';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

jest.mock('./inference_client');
jest.mock('../../common/inference_client/bind_client');
import { createInferenceClient } from './inference_client';
import { bindClient } from '../../common/inference_client/bind_client';
import { createRegexWorkerServiceMock } from '../test_utils';

const bindClientMock = bindClient as jest.MockedFn<typeof bindClient>;
const createInferenceClientMock = createInferenceClient as jest.MockedFn<
  typeof createInferenceClient
>;
const mockEsClient = {
  ml: {
    inferTrainedModel: jest.fn(),
  },
} as any;
describe('createClient', () => {
  let logger: MockedLogger;
  let actions: ReturnType<typeof actionsMock.createStart>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let regexWorker: ReturnType<typeof createRegexWorkerServiceMock>;

  beforeEach(() => {
    logger = loggerMock.create();
    actions = actionsMock.createStart();
    request = httpServerMock.createKibanaRequest();
    regexWorker = createRegexWorkerServiceMock();
  });

  afterEach(() => {
    bindClientMock.mockReset();
    createInferenceClientMock.mockReset();
  });

  describe('when `bindTo` is not specified', () => {
    it('calls createInferenceClient and return the client', () => {
      const expectedResult = Symbol('expected') as any;
      createInferenceClientMock.mockReturnValue(expectedResult);

      const result = createClient({
        request,
        actions,
        logger,
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      expect(createInferenceClientMock).toHaveBeenCalledTimes(1);
      expect(createInferenceClientMock).toHaveBeenCalledWith({
        request,
        actions,
        logger: logger.get('client'),
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      expect(bindClientMock).not.toHaveBeenCalled();

      expect(result).toBe(expectedResult);
    });

    it('return a client with the expected type', async () => {
      createInferenceClientMock.mockReturnValue({
        chatComplete: jest.fn(),
      } as any);

      const client = createClient({
        request,
        actions,
        logger,
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      // type check on client.chatComplete
      await client.chatComplete({
        messages: [],
        connectorId: '.foo',
      });
    });
  });

  describe('when `bindTo` is specified', () => {
    it('calls createInferenceClient and bindClient and forward the expected value', () => {
      const createInferenceResult = Symbol('createInferenceResult') as any;
      createInferenceClientMock.mockReturnValue(createInferenceResult);

      const bindClientResult = Symbol('bindClientResult') as any;
      bindClientMock.mockReturnValue(bindClientResult);

      const result = createClient({
        request,
        actions,
        logger,
        bindTo: {
          connectorId: '.my-connector',
        },
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      expect(createInferenceClientMock).toHaveBeenCalledTimes(1);
      expect(createInferenceClientMock).toHaveBeenCalledWith({
        request,
        actions,
        logger: logger.get('client'),
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      expect(bindClientMock).toHaveBeenCalledTimes(1);
      expect(bindClientMock).toHaveBeenCalledWith(createInferenceResult, {
        connectorId: '.my-connector',
      });

      expect(result).toBe(bindClientResult);
    });

    it('return a client with the expected type', async () => {
      bindClientMock.mockReturnValue({
        chatComplete: jest.fn(),
      } as any);

      const client = createClient({
        request,
        actions,
        logger,
        bindTo: {
          connectorId: '.foo',
        },
        esClient: mockEsClient,
        anonymizationRulesPromise: Promise.resolve([]),
        regexWorker,
      });

      // type check on client.chatComplete
      await client.chatComplete({
        messages: [],
      });
    });
  });
});
