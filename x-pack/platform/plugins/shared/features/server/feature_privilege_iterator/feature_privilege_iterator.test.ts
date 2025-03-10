/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-plugin/common/types';
import { LICENSE_TYPE } from '@kbn/licensing-plugin/server';
import { KibanaFeature } from '..';
import { SubFeaturePrivilegeConfig } from '../../common';
import type { FeaturePrivilegeIteratorOptions } from './feature_privilege_iterator';
import { featurePrivilegeIterator } from './feature_privilege_iterator';

function getFeaturePrivilegeIterator(
  feature: KibanaFeature,
  options: Omit<FeaturePrivilegeIteratorOptions, 'licenseHasAtLeast'> & { licenseType: LicenseType }
) {
  const { licenseType, ...otherOptions } = options;
  const licenseHasAtLeast = (licenseTypeToCheck: LicenseType) => {
    return LICENSE_TYPE[licenseTypeToCheck] <= LICENSE_TYPE[options.licenseType];
  };
  return featurePrivilegeIterator(feature, { licenseHasAtLeast, ...otherOptions });
}

describe('featurePrivilegeIterator', () => {
  it('handles features with no privileges', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      privileges: null,
      app: [],
      category: { id: 'foo', label: 'foo' },
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toHaveLength(0);
  });

  it('handles features with no sub-features', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('filters privileges using the provided predicate', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type-alerts', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
        predicate: (privilegeId) => privilegeId === 'all',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type-alerts', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `augmentWithSubFeaturePrivileges` is false', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: [],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    create: ['cases-create-sub-type'],
                    read: ['cases-read-sub-type'],
                    update: ['cases-update-sub-type'],
                    delete: ['cases-delete-sub-type'],
                    push: ['cases-push-sub-type'],
                    settings: ['cases-settings-sub-type'],
                    createComment: ['cases-create-comment-type'],
                    reopenCase: ['cases-reopen-type'],
                    assign: ['cases-assign-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: false,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: [],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `includeIn` is none, even if `augmentWithSubFeaturePrivileges` is true', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'none',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    create: ['cases-create-sub-type'],
                    read: ['cases-read-sub-type'],
                    update: ['cases-update-sub-type'],
                    delete: ['cases-delete-sub-type'],
                    push: ['cases-push-sub-type'],
                    settings: ['cases-settings-sub-type'],
                    createComment: ['cases-create-comment-type'],
                    reopenCase: ['cases-reopen-type'],
                    assign: ['cases-assign-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: read`', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    create: ['cases-create-sub-type'],
                    read: ['cases-read-sub-type'],
                    update: ['cases-update-sub-type'],
                    delete: ['cases-delete-sub-type'],
                    push: ['cases-push-sub-type'],
                    settings: ['cases-settings-sub-type'],
                    createComment: ['cases-create-comment-sub-type'],
                    reopenCase: ['cases-reopen-sub-type'],
                    assign: ['cases-assign-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type', 'cases-all-sub-type'],
            create: ['cases-create-type', 'cases-create-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
            update: ['cases-update-type', 'cases-update-sub-type'],
            delete: ['cases-delete-type', 'cases-delete-sub-type'],
            push: ['cases-push-type', 'cases-push-sub-type'],
            settings: ['cases-settings-type', 'cases-settings-sub-type'],
            createComment: ['cases-create-comment-type', 'cases-create-comment-sub-type'],
            reopenCase: ['cases-reopen-type', 'cases-reopen-sub-type'],
            assign: ['cases-assign-type', 'cases-assign-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
            create: ['cases-create-sub-type'],
            update: ['cases-update-sub-type'],
            delete: ['cases-delete-sub-type'],
            push: ['cases-push-sub-type'],
            settings: ['cases-settings-sub-type'],
            createComment: ['cases-create-comment-sub-type'],
            reopenCase: ['cases-reopen-sub-type'],
            assign: ['cases-assign-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
    ]);
  });

  it('does not duplicate privileges when merging', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['read-api'],
                  app: ['foo'],
                  catalogue: ['foo-catalogue'],
                  management: {
                    section: ['foo-management'],
                  },
                  savedObject: {
                    all: [],
                    read: ['read-type'],
                  },
                  alerting: {
                    alert: {
                      all: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    read: ['cases-read-type'],
                  },
                  ui: ['ui-action'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: [],
            create: [],
            read: ['cases-read-type'],
            update: [],
            delete: [],
            push: [],
            settings: [],
            createComment: [],
            reopenCase: [],
            assign: [],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: all`', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: ['cases-assign-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'all',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                    create: ['cases-create-sub-type'],
                    update: ['cases-update-sub-type'],
                    delete: ['cases-delete-sub-type'],
                    push: ['cases-push-sub-type'],
                    settings: ['cases-settings-sub-type'],
                    createComment: ['cases-create-comment-sub-type'],
                    reopenCase: ['cases-reopen-sub-type'],
                    assign: ['cases-assign-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [],
            },
            alert: {
              all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type', 'cases-all-sub-type'],
            create: ['cases-create-type', 'cases-create-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
            update: ['cases-update-type', 'cases-update-sub-type'],
            delete: ['cases-delete-type', 'cases-delete-sub-type'],
            push: ['cases-push-type', 'cases-push-sub-type'],
            settings: ['cases-settings-type', 'cases-settings-sub-type'],
            createComment: ['cases-create-comment-type', 'cases-create-comment-sub-type'],
            reopenCase: ['cases-reopen-type', 'cases-reopen-sub-type'],
            assign: ['cases-assign-type', 'cases-assign-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  describe('excludes sub-feature privileges when the minimum license is not met', () => {
    function createSubFeaturePrivilegeConfig(licenseType: LicenseType): SubFeaturePrivilegeConfig {
      return {
        // This is not a realistic sub-feature privilege config, but we only need the "api" string for our test cases
        id: `${licenseType}-sub-feature`,
        name: '',
        includeIn: 'all',
        minimumLicense: licenseType,
        api: [`${licenseType}-api`],
        savedObject: { all: [], read: [] },
        ui: [],
      };
    }

    const feature = new KibanaFeature({
      id: 'feature',
      name: 'feature-name',
      app: [],
      category: { id: 'category-id', label: 'category-label' },
      privileges: {
        all: { savedObject: { all: ['obj-type'], read: [] }, ui: [] },
        read: { savedObject: { all: [], read: ['obj-type'] }, ui: [] },
      },
      subFeatures: [
        {
          name: `sub-feature-name`,
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                createSubFeaturePrivilegeConfig('gold'),
                createSubFeaturePrivilegeConfig('platinum'),
                createSubFeaturePrivilegeConfig('enterprise'),
                // Note: we intentionally do not include a sub-feature privilege config for the "trial" license because that should never be used
              ],
            },
          ],
        },
      ],
    });

    // Each of the test cases below is a minimal check to make sure the correct sub-feature privileges are applied -- nothing more, nothing less
    // Note: we do not include a test case for the "basic" license, because sub-feature privileges are not enabled at that license level

    it('with a gold license', () => {
      const actualPrivileges = Array.from(
        getFeaturePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseType: 'gold',
        })
      );
      const expectedPrivilege = expect.objectContaining({ api: ['gold-api'] });
      expect(actualPrivileges).toEqual(
        expect.arrayContaining([{ privilegeId: 'all', privilege: expectedPrivilege }])
      );
    });

    it('with a platinum license', () => {
      const actualPrivileges = Array.from(
        getFeaturePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseType: 'platinum',
        })
      );
      const expectedPrivilege = expect.objectContaining({ api: ['gold-api', 'platinum-api'] });
      expect(actualPrivileges).toEqual(
        expect.arrayContaining([{ privilegeId: 'all', privilege: expectedPrivilege }])
      );
    });

    it('with an enterprise license', () => {
      const actualPrivileges = Array.from(
        getFeaturePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseType: 'enterprise',
        })
      );
      const expectedPrivilege = expect.objectContaining({
        api: ['gold-api', 'platinum-api', 'enterprise-api'],
      });
      expect(actualPrivileges).toEqual(
        expect.arrayContaining([{ privilegeId: 'all', privilege: expectedPrivilege }])
      );
    });

    it('with a trial license', () => {
      const actualPrivileges = Array.from(
        getFeaturePrivilegeIterator(feature, {
          augmentWithSubFeaturePrivileges: true,
          licenseType: 'trial',
        })
      );
      const expectedPrivilege = expect.objectContaining({
        api: ['gold-api', 'platinum-api', 'enterprise-api'],
      });
      expect(actualPrivileges).toEqual(
        expect.arrayContaining([{ privilegeId: 'all', privilege: expectedPrivilege }])
      );
    });
  });

  it(`can augment primary feature privileges even if they don't specify their own`, () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    rule: {
                      all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
                      read: [{ ruleTypeId: 'alerting-read-sub-type', consumers: ['foo'] }],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    create: ['cases-create-sub-type'],
                    read: ['cases-read-sub-type'],
                    update: ['cases-update-sub-type'],
                    delete: ['cases-delete-sub-type'],
                    push: ['cases-push-sub-type'],
                    settings: ['cases-settings-sub-type'],
                    createComment: ['cases-create-comment-sub-type'],
                    reopenCase: ['cases-reopen-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['sub-feature-api'],
          app: ['sub-app'],
          catalogue: ['sub-catalogue'],
          management: {
            section: ['other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-sub-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-sub-type', consumers: ['foo'] }],
            },
            alert: {
              all: [],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            create: ['cases-create-sub-type'],
            read: ['cases-read-sub-type'],
            update: ['cases-update-sub-type'],
            delete: ['cases-delete-sub-type'],
            push: ['cases-push-sub-type'],
            settings: ['cases-settings-sub-type'],
            createComment: ['cases-create-comment-sub-type'],
            reopenCase: ['cases-reopen-sub-type'],
            assign: [],
          },
          ui: ['ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['sub-feature-api'],
          app: ['sub-app'],
          catalogue: ['sub-catalogue'],
          management: {
            section: ['other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-sub-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-sub-type', consumers: ['foo'] }],
              read: [{ ruleTypeId: 'alerting-read-sub-type', consumers: ['foo'] }],
            },
            alert: {
              all: [],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            create: ['cases-create-sub-type'],
            read: ['cases-read-sub-type'],
            update: ['cases-update-sub-type'],
            delete: ['cases-delete-sub-type'],
            push: ['cases-push-sub-type'],
            settings: ['cases-settings-sub-type'],
            createComment: ['cases-create-comment-sub-type'],
            reopenCase: ['cases-reopen-sub-type'],
            assign: [],
          },
          ui: ['ui-sub-type'],
        },
      },
    ]);
  });

  it(`can augment primary feature privileges even if the sub-feature privileges don't specify their own`, () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      getFeaturePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [{ ruleTypeId: 'alerting-all-type', consumers: ['foo'] }],
              read: [],
            },
            alert: {
              all: [],
              read: [{ ruleTypeId: 'alerting-another-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: ['cases-all-type'],
            create: ['cases-create-type'],
            read: ['cases-read-type'],
            update: ['cases-update-type'],
            delete: ['cases-delete-type'],
            push: ['cases-push-type'],
            settings: ['cases-settings-type'],
            createComment: ['cases-create-comment-type'],
            reopenCase: ['cases-reopen-type'],
            assign: [],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
            alert: {
              all: [],
              read: [{ ruleTypeId: 'alerting-read-type', consumers: ['foo'] }],
            },
          },
          cases: {
            all: [],
            create: [],
            read: ['cases-read-type'],
            update: [],
            delete: [],
            push: [],
            settings: [],
            createComment: [],
            reopenCase: [],
            assign: [],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });
});
