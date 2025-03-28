/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Plugin,
  CoreSetup,
  CoreStart,
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';
import { firstValueFrom, Subject } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export interface SampleTaskManagerFixtureStartDeps {
  taskManager: TaskManagerStartContract;
}

const taskManagerQuery = (...filters: any[]) => ({
  bool: {
    filter: {
      bool: {
        must: filters,
      },
    },
  },
});

const tasksForAlerting = {
  term: {
    'task.scope': 'alerting',
  },
};
const taskByIdQuery = (id: string) => ({
  ids: {
    values: [`task:${id}`],
  },
});

export class SampleTaskManagerFixturePlugin
  implements Plugin<void, void, {}, SampleTaskManagerFixtureStartDeps>
{
  taskManagerStart$: Subject<TaskManagerStartContract> = new Subject<TaskManagerStartContract>();
  taskManagerStart: Promise<TaskManagerStartContract> = firstValueFrom(this.taskManagerStart$);

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/alerting_tasks/{taskId}',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          params: schema.object({
            taskId: schema.string(),
          }),
        },
      },
      async (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> => {
        try {
          const taskManager = await this.taskManagerStart;
          return res.ok({
            body: await taskManager.fetch({
              query: taskManagerQuery(tasksForAlerting, taskByIdQuery(req.params.taskId)),
            }),
          });
        } catch (err) {
          return res.badRequest({ body: err });
        }
      }
    );

    router.get(
      {
        path: `/api/ensure_tasks_index_refreshed`,
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {},
      },
      async function (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> {
        const coreCtx = await context.core;
        await coreCtx.elasticsearch.client.asInternalUser.indices.refresh({
          index: '.kibana_task_manager',
        });
        return res.ok({ body: {} });
      }
    );

    router.post(
      {
        path: '/api/alerting_tasks/run_mark_tasks_as_unrecognized',
        security: {
          authz: {
            enabled: false,
            reason: 'This route is opted out from authorization',
          },
        },
        validate: {
          body: schema.object({}),
        },
      },
      async (
        context: RequestHandlerContext,
        req: KibanaRequest<any, any, any, any>,
        res: KibanaResponseFactory
      ): Promise<IKibanaResponse<any>> => {
        try {
          const taskManager = await this.taskManagerStart;
          await taskManager.ensureScheduled({
            id: 'mark_removed_tasks_as_unrecognized',
            taskType: 'task_manager:mark_removed_tasks_as_unrecognized',
            schedule: { interval: '1h' },
            state: {},
            params: {},
          });
          return res.ok({ body: await taskManager.runSoon('mark_removed_tasks_as_unrecognized') });
        } catch (err) {
          return res.ok({ body: { id: 'mark_removed_tasks_as_unrecognized', error: `${err}` } });
        }
      }
    );
  }

  public start(core: CoreStart, { taskManager }: SampleTaskManagerFixtureStartDeps) {
    this.taskManagerStart$.next(taskManager);
    this.taskManagerStart$.complete();
  }
  public stop() {}
}
