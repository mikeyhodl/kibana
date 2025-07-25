/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup } from '@kbn/infra-forge';
import { loadTestData } from '../../../services/slo/helper/load_test_data';
import { sloData } from '../../../services/slo/fixtures/create_slo';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard']);
  const esClient = getService('es');
  const logger = getService('log');
  const sloApi = getService('sloApi');
  const sloUi = getService('sloUi');
  const dashboardAddPanel = getService('dashboardAddPanel');

  describe('OverviewEmbeddable', function () {
    before(async () => {
      await loadTestData(getService);
      await sloApi.createUser();
      await sloApi.deleteAllSLOs();
      await sloApi.create(sloData);
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.dashboard.switchToEditMode();
    });

    after(async () => {
      await sloApi.deleteAllSLOs();
      await cleanup({ esClient, logger });
      try {
        await esClient.deleteByQuery({
          index: 'kbn-data-forge-fake_hosts*',
          query: { term: { 'system.network.name': 'eth1' } },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('SLO api integration test data not found');
      }
    });

    describe('Single SLO', function () {
      it('should open SLO configuration flyout', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('observability');
        await dashboardAddPanel.clickAddNewPanelFromUIActionLink('SLO Overview');
        await sloUi.common.assertSloOverviewConfigurationExists();
      });

      it('should have an overview mode selector', async () => {
        await sloUi.common.assertOverviewModeSelectorExists();
      });

      it('can select an SLO', async () => {
        await sloUi.common.assertOverviewSloSelectorExists();
        await sloUi.common.setComboBoxSloSelection();
        await sloUi.common.clickOverviewCofigurationSaveButton();
      });

      it('creates an overview panel', async () => {
        await sloUi.common.assertSingleOverviewPanelExists();
        await sloUi.common.dismissAllToasts();
      });

      it('renders SLO card item chart', async () => {
        await sloUi.common.assertSingleOverviewPanelContentExists();
      });
    });

    describe('Group of SLOs', function () {
      it('can select Group Overview mode in the Flyout configuration', async () => {
        await dashboardAddPanel.clickEditorMenuButton();
        await dashboardAddPanel.verifyEmbeddableFactoryGroupExists('observability');
        await dashboardAddPanel.clickAddNewPanelFromUIActionLink('SLO Overview');
        await sloUi.common.clickOverviewMode();
        await sloUi.common.assertSloConfigurationGroupOverviewModeIsSelected();
      });

      it('can select a group by', async () => {
        await sloUi.common.assertGroupOverviewConfigurationGroupByExists();
      });

      it('can optionally select a group', async () => {
        await sloUi.common.assertGroupOverviewConfigurationGroupExists();
      });

      it('can optionally search for custom query', async () => {
        await sloUi.common.assertGroupOverviewConfigurationKqlBarExists();
      });

      it('creates a group overview panel', async () => {
        await sloUi.common.clickOverviewCofigurationSaveButton();
        await sloUi.common.assertGroupOverviewPanelExists();
        await sloUi.common.dismissAllToasts();
      });
    });
  });
}
