'use strict';
/**
 * Lifecycle callbacks for the `User` model.
 */

const uuid = require('uuid');
const nonce = Math.floor(Math.random() * 10000);

module.exports = {
  beforeCreate: async (model) => {
    model.set('nonce', nonce);
    model.set('id', uuid());
  }
};