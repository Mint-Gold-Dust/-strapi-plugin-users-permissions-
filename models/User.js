'use strict';
/**
 * Lifecycle callbacks for the `User` model.
 */

const slugify = require('slugify');
const nonce = Math.floor(Math.random() * 10000);

module.exports = {
  lifecycles: {
    async beforeCreate(data) {
      if (data.username) {
        data.slug = slugify(data.username, { lower: true });
      }
      data.nonce = nonce;
    },
    async beforeUpdate(params, data) {
      if (data.username) {
        data.slug = slugify(data.username, { lower: true });
      }
    },
    async afterCreate(result) {
      if (result.type === "collector") {
        // Trigger calculation of Collector-stats for new user by ethereum address
        strapi.services['collector-stats'].enqueue(result.ethereumAddress);
      }
    }
  },
};
