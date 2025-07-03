import fs from 'fs';
const path = require('path');

// This is a single-line comment
/*
 This is a multi-line comment
 describing the module
*/
/**  add two numbers 
 * @param {number} a
 * @param {number} b
 * @returns {number}
*/
// Adds two numbers
// Not exported

export function add(a, b) {}
export const version = '1.0.0';
export let status = 'active';

function internalHelper() {}
const notExported = 42;

// CommonJS exports
module.exports = { add, version };
exports.helper = function() {};
module.exports.util = () => {};