// Main background-page script

import * as Message from '../message';
import * as Merchant from './merchant';
import initializeInjection from './injection';
import {getEnabled} from './injectionConfig';
import {getTerritoryFlag} from './storageUtil';
import {initialize as initalizePaymentMethodWatcher} from './paymentMethod';
import * as analytics from './analytics';
import log from '../log';
import reinitializeReload from './reload';

const reloadProxy = (handler) => (...args) => {
  reinitializeReload();
  return handler(...args);
};

// Register for messages coming from content script
Message.GetAvastPayEnabled.register(reloadProxy((data, sender, handler) =>
  getEnabled(handler)
));

Message.Parse.register(reloadProxy((data, sender, handler, defaultValue) =>
  Merchant.parse(data.content, data.hostname, handler, defaultValue)
));

Message.GetShoppingCartRequest.register(reloadProxy((data) =>
  Merchant.getShoppingCartRequest(data.hostname)
));

Message.GetClearCartRequest.register(reloadProxy((data) =>
  Merchant.getClearCartRequest(data.hostname, data.products)
));

Message.GetCheckoutElements.register(reloadProxy((data) =>
  Merchant.getCheckoutElements(data.hostname)
));

Message.GetMerchantInfo.register(reloadProxy((data) =>
  Merchant.getMerchantInfo(data.hostname)
));

Message.PrepareSentData.register(reloadProxy((data) =>
  Merchant.prepareSentData(data.products, data.hostname)
));

// Initialize content script injection logic
getTerritoryFlag(enabled => {
  if (!enabled) {
    log('Territory blocked');
    analytics.event('Logic', 'territoryBlocked');
    return;
  }

  initializeInjection();
  initalizePaymentMethodWatcher();
  reinitializeReload();
});
