// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as AutofillManager from '../../../../../front_end/models/autofill_manager/autofill_manager.js';

import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

describeWithMockConnection('AutofillManager', () => {
  let target: SDK.Target.Target;
  let model: SDK.AutofillModel.AutofillModel;
  let autofillManager: AutofillManager.AutofillManager.AutofillManager;
  let showViewStub: sinon.SinonStub;

  beforeEach(() => {
    target = createTarget();
    const maybeModel = target.model(SDK.AutofillModel.AutofillModel);
    assertNotNullOrUndefined(maybeModel);
    model = maybeModel;
    showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();
    autofillManager = AutofillManager.AutofillManager.AutofillManager.instance({forceNew: true});
  });

  afterEach(() => {
    showViewStub.restore();
  });

  describe('emits AddressFormFilled events', () => {
    const assertAutofillManagerEvent = async (
        inEvent: Protocol.Autofill.AddressFormFilledEvent,
        outEvent: AutofillManager.AutofillManager.AddressFormFilledEvent) => {
      const dispatchedAutofillEvents: AutofillManager.AutofillManager.AddressFormFilledEvent[] = [];
      autofillManager.addEventListener(
          AutofillManager.AutofillManager.Events.AddressFormFilled, event => dispatchedAutofillEvents.push(event.data));
      model.dispatchEventToListeners(
          SDK.AutofillModel.Events.AddressFormFilled, {autofillModel: model, event: inEvent});
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.isTrue(showViewStub.calledOnceWithExactly('autofill-view'));
      assert.deepStrictEqual(dispatchedAutofillEvents, [outEvent]);
    };

    it('with a single match', async () => {
      const filledFields = [
        {
          htmlType: 'text',
          id: 'input1',
          name: '',
          value: 'Crocodile',
          autofillType: 'First name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
          fieldId: 1 as Protocol.DOM.BackendNodeId,
        },
      ];
      const inEvent = {
        addressUi: {
          addressFields: [
            {
              fields: [
                {name: 'NAME_FULL', value: 'Crocodile Dundee'},
              ],
            },
          ],
        },
        filledFields,
      };
      const outEvent = {
        address: 'Crocodile Dundee',
        filledFields,
        matches: [{startIndex: 0, endIndex: 9, filledFieldIndex: 0}],
        autofillModel: model,
      };
      await assertAutofillManagerEvent(inEvent, outEvent);
    });

    it('with multiple matches', async () => {
      const filledFields = [
        {
          htmlType: 'text',
          id: 'input1',
          name: '',
          value: 'Crocodile',
          autofillType: 'First name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
          fieldId: 1 as Protocol.DOM.BackendNodeId,
        },
        {
          htmlType: 'text',
          id: 'input2',
          name: '',
          value: 'Dundee',
          autofillType: 'Last name',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
          fieldId: 2 as Protocol.DOM.BackendNodeId,
        },
      ];
      const inEvent = {
        addressUi: {
          addressFields: [
            {
              fields: [
                {name: 'NAME_FULL', value: 'Crocodile Dundee'},
              ],
            },
          ],
        },
        filledFields,
      };
      const outEvent = {
        address: 'Crocodile Dundee',
        filledFields,
        matches: [
          {startIndex: 0, endIndex: 9, filledFieldIndex: 0},
          {startIndex: 10, endIndex: 16, filledFieldIndex: 1},
        ],
        autofillModel: model,
      };
      await assertAutofillManagerEvent(inEvent, outEvent);
    });

    it('with new line characters and commas', async () => {
      const filledFields = [
        {
          htmlType: 'text',
          id: 'input1',
          name: '',
          value: 'Outback Road 1, Melbourne',
          autofillType: 'Street address',
          fillingStrategy: Protocol.Autofill.FillingStrategy.AutofillInferred,
          fieldId: 1 as Protocol.DOM.BackendNodeId,
        },
      ];
      const inEvent = {
        addressUi: {
          addressFields: [
            {
              fields: [
                {name: 'ADDRESS_HOME_STREET_ADDRESS', value: 'Outback Road 1\nMelbourne'},
              ],
            },
          ],
        },
        filledFields,
      };
      const outEvent = {
        address: 'Outback Road 1\nMelbourne',
        filledFields,
        matches: [{startIndex: 0, endIndex: 24, filledFieldIndex: 0}],
        autofillModel: model,
      };
      await assertAutofillManagerEvent(inEvent, outEvent);
    });
  });
});
