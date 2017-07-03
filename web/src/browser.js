// Wrapper for web-extension/browser interfaces

// global chrome
// istanbul ignore next
const browser = () => {
  try {
    return chrome;
  } catch (err) {} // eslint-disable-line no-empty
  return {};
};

export default browser;
export const tabs = browser().tabs;
export const runtime = browser().runtime;

export const global = window;
