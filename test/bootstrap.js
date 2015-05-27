/*
 BOOTSTRAP FOR TESTS
 */

'use strict';

//disable logger
require('./../libs/logger').enabled = false;

//increase listeners - many tests
process.setMaxListeners(100);
