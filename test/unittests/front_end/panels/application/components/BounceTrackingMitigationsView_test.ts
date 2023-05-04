// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ApplicationComponents from '../../../../../../front_end/panels/application/components/components.js';
import * as DataGrid from '../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertElement,
  assertShadowRoot,
  dispatchClickEvent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../helpers/DOMHelpers.js';
import {createTarget, describeWithLocale} from '../../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../../helpers/MockConnection.js';
import {getValuesOfAllBodyRows} from '../../../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const {assert} = chai;

async function renderBounceTrackingMitigationsView():
    Promise<ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView> {
  const component = new ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView();
  renderElementIntoDOM(component);

  // The data-grid's renderer is scheduled, so we need to wait until the coordinator
  // is done before we can test against it.
  await coordinator.done();

  return component;
}

function getInternalDataGridShadowRoot(
    component: ApplicationComponents.BounceTrackingMitigationsView.BounceTrackingMitigationsView): ShadowRoot {
  const dataGridController = getElementWithinComponent(
      component, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const dataGrid = getElementWithinComponent(dataGridController, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(dataGrid.shadowRoot);
  return dataGrid.shadowRoot;
}

describeWithLocale('BounceTrackingMitigationsView', () => {
  it('shows no message or table if the force run button has not been clicked', async () => {
    const component = await renderBounceTrackingMitigationsView();
    assertShadowRoot(component.shadowRoot);

    const nullGridElement = component.shadowRoot.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const sections = component.shadowRoot.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepStrictEqual(sectionsText, expected);
  });
});

describeWithMockConnection('BounceTrackingMitigationsView', () => {
  it('hides deleted sites table and shows explanation message when there are no deleted tracking sites', async () => {
    createTarget();
    setMockConnectionResponseHandler('Storage.runBounceTrackingMitigations', () => ({deletedSites: []}));

    const component = await renderBounceTrackingMitigationsView();

    assertShadowRoot(component.shadowRoot);
    const forceRunButton = component.shadowRoot.querySelector('[aria-label="Force run"]');
    assertElement(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);

    await coordinator.done();

    const nullGridElement = component.shadowRoot.querySelector('devtools-data-grid-controller');
    assert.isNull(nullGridElement);

    const sections = component.shadowRoot.querySelectorAll('devtools-report-section');
    const sectionsText = Array.from(sections).map(section => section.textContent?.trim());
    const expected = [
      'Force run',
      'State was not cleared for any potential bounce tracking sites. Either none were identified, bounce tracking mitigations are not enabled, or third-party cookies are not blocked.',
      'Learn more: Bounce Tracking Mitigations',
    ];

    assert.deepStrictEqual(sectionsText, expected);
  });

  it('renders deleted sites in a table', async () => {
    createTarget();
    setMockConnectionResponseHandler(
        'Storage.runBounceTrackingMitigations', () => ({deletedSites: ['tracker-1.example', 'tracker-2.example']}));

    const component = await renderBounceTrackingMitigationsView();

    assertShadowRoot(component.shadowRoot);
    const forceRunButton = component.shadowRoot.querySelector('[aria-label="Force run"]');
    assertElement(forceRunButton, HTMLElement);
    dispatchClickEvent(forceRunButton);

    await coordinator.done({waitForWork: true});

    const dataGridShadowRoot = getInternalDataGridShadowRoot(component);
    const rowValues = getValuesOfAllBodyRows(dataGridShadowRoot);
    assert.deepEqual(rowValues, [
      ['tracker-1.example'],
      ['tracker-2.example'],
    ]);
  });
});
