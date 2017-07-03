import {isDebug} from '../constants';

const tag = 'MailProxy';

/* eslint-disable no-console */
const log = (...args) => isDebug && console.log(tag, ...args);
export const info = (...args) => isDebug && console.info(tag, ...args);
export const warn = (...args) => isDebug && console.warn(tag, ...args);
export const error = (...args) => console.error(tag, ...args);

export default log;
