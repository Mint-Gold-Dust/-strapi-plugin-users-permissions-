'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require('lodash');
const { sanitizeEntity } = require('strapi-utils');
const adminUserController = require('./user/admin');
const apiUserController = require('./user/api');

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

const resolveController = ctx => {
  const {
    state: { isAuthenticatedAdmin },
  } = ctx;

  return isAuthenticatedAdmin ? adminUserController : apiUserController;
};

const resolveControllerMethod = method => ctx => {
  const controller = resolveController(ctx);
  const callbackFn = controller[method];

  if (!_.isFunction(callbackFn)) {
    return ctx.notFound();
  }

  return callbackFn(ctx);
};

module.exports = {
  create: resolveControllerMethod('create'),
  update: resolveControllerMethod('update'),

  /**
   * Retrieve user records.
   * @return {Object|Array}
   */
  async find(ctx, next, { populate } = {}) {
    let users;

    if (_.has(ctx.query, '_q')) {
      // use core strapi query to search for users
      users = await strapi.query('user', 'users-permissions').search(ctx.query, populate);
    } else {
      users = await strapi.plugins['users-permissions'].services.user.fetchAll(ctx.query, populate);
    }

    ctx.body = users.map(sanitizeUser);
  },

  /**
   * Retrieve a user record.
   * @return {Object}
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    let data = await strapi.plugins['users-permissions'].services.user.fetch({
      id,
    });

    if (data) {
      data = sanitizeUser(data);
    }

    // Send 200 `ok`
    ctx.body = data;
  },

  /**
   * Retrieve a user record.
   * @return {Object}
   */
  async findOneByEthereumAddress(ctx) {
    const { ethereumAddress } = ctx.params;
    let data = await strapi.plugins['users-permissions'].services.user.fetch({
      ethereumAddress,
    });

    if (data) {
      const nonce = Object.fromEntries(Object.entries(data).filter(([key, value]) => key.includes('nonce')))
      data = sanitizeUser(nonce);
    }

    // try {
    //   await strapi.plugins['users-permissions'].services.user.updateNonce(user);
    // } catch (err) {
    //   return ctx.badRequest(null, err);
    // }

    // Send 200 `ok`
    ctx.body = data;
  },

  /**
   * Retrieve user count.
   * @return {Number}
   */
  async count(ctx) {
    if (_.has(ctx.query, '_q')) {
      return await strapi.plugins['users-permissions'].services.user.countSearch(ctx.query);
    }
    ctx.body = await strapi.plugins['users-permissions'].services.user.count(ctx.query);
  },

  /**
   * Destroy a/an user record.
   * @return {Object}
   */
  async destroy(ctx) {
    const { id } = ctx.params;
    const data = await strapi.plugins['users-permissions'].services.user.remove({ id });
    ctx.send(sanitizeUser(data));
  },

  async destroyAll(ctx) {
    const {
      request: { query },
    } = ctx;

    const toRemove = Object.values(_.omit(query, 'source'));
    const { primaryKey } = strapi.query('user', 'users-permissions');
    const finalQuery = { [`${primaryKey}_in`]: toRemove, _limit: 100 };

    const data = await strapi.plugins['users-permissions'].services.user.removeAll(finalQuery);

    ctx.send(data);
  },

  /**
   * Retrieve authenticated user.
   * @return {Object|Array}
   */
  async me(ctx) {
    let user = ctx.state.user;

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    user = await strapi.plugins['users-permissions'].services.user.fetch({ id: user.id }, ['minted_artworks', 'owned_artworks', 'placed_orders', 'fulfilled_orders', 'stats', 'profile_picture', 'memoirs', 'interviews', 'links'])

    ctx.body = sanitizeUser(user);
  },

  /**
   * Update authenticated User
   */
  async updateMe(ctx) {
    const user = ctx.state.user

    if (!user) {
      return ctx.badRequest(null, [{ messages: [{ id: 'No authorization header was found' }] }]);
    }

    const { email, profile_picture, bio, links = [] } = ctx.request.body;

    const updatedUser = await strapi.plugins['users-permissions'].services.user.edit({ id: user.id }, {
      email,
      profile_picture,
      bio,
      links
    });

    ctx.body = sanitizeUser(updatedUser);
  },

  /**
   * get Users with type=artist + params for pagination
   */
  async getArtists(ctx) {
    let params = ctx.params
    let users;
    let usersCount;

    params["type"] = "artist"

    usersCount = await strapi.plugins['users-permissions'].services.user.count(params);
    users = await strapi.plugins['users-permissions'].services.user.find(
      params, ['profile_picture', 'slug', 'username']
    );

    if (!users) {
      return ctx.badRequest('No artists found');
    }

    // sanitize and append artists and append count
    entities["artists"] = users.map(entity => sanitizeEntity(entity, { model: strapi.plugins['users-permissions'].models.user }));
    entities["count"] = usersCount

    return entities
  }
}
