import {runtime, global} from './browser';
import {debug as log, error as logError} from './log';

// Messaging between content and background script
const defaultMessageTimeout = 1000; // 1sec
const sendMessage = (method, responseHandler, data, timeoutResponse, timeout = defaultMessageTimeout) => {
  const responseRequired = !!responseHandler;
  let timeoutId;
  const handler = (...args) => {
    if (timeoutId !== undefined) {
      global.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    responseHandler(...args);
  };

  if (responseRequired && timeout !== undefined) {
    timeoutId = global.setTimeout(() => {
      logError(`Message ${method} timed-out`);
      timeoutId = undefined;
      handler(timeoutResponse);
    }, timeout);
  }

  runtime.sendMessage({method, data, responseRequired}, handler);
};

let registeredMessages;
const registerMessage = (method, handler, defaultValue, asynchronous) => {
  if (!registeredMessages) {
    registeredMessages = {};
    const messageHandler = (request, sender, sendResponse) => {
      const registered = registeredMessages[request.method];
      if (!registered) return false;

      log('MESSAGE', request);
      const processResponse = (response) => {
        if (request.responseRequired) {
          log('RESPONSE', request.method, response);
          sendResponse(response);
        }
      };

      try {
        if (registered.asynchronous) {
          registered.handler(request.data, sender, processResponse, registered.defaultValue);
          return true;
        } else {
          processResponse(registered.handler(request.data, sender));
        }
      } catch (err) {
        logError(err);
        processResponse(registered.defaultValue);
      }

      return false;
    };
    runtime.onMessage.addListener(messageHandler);
  }

  registeredMessages[method] = {handler, defaultValue, asynchronous};

  // return unregister handler
  return () => {
    delete registeredMessages[method];
  };
};

// specific messages
export const CreateNewAddress = {
  get: (responseHandler) => sendMessage('createNewAddress', responseHandler),
  register: (requestHandler) => registerMessage('createNewAddress', requestHandler, undefined, 'async'),
};
