const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const friendController = require("../controllers/friend.controller");
const { body, param } = require("express-validator");

/**
 * @route POST /friends/requests
 * @description Send a friend request
 * @access Login required
 */
router.post(
  "/requests",
  authMiddleware.loginRequired,
  validators.validate([
    body("to").exists().isString().custom(validators.checkObjectId),
  ]),
  friendController.sendFriendRequest
);

/**
 * @route GET /friends/requests/incoming
 * @description Get the list of received pending requests
 * @access Login required
 */
router.get(
  "/requests/incoming",
  authMiddleware.loginRequired,
  friendController.getReceivedFriendRequestList
);

/**
 * @route GET /friends/requests/outgoing
 * @description Get the list of sent pending requests
 * @access Login required
 */
router.get(
  "/request/outgoing",
  authMiddleware.loginRequired,
  friendController.getSentFriendRequestList
);

/**
 * @route PUT /friends/requests/:id
 * @description Accept/Reject a received pending requests
 * @access Login required
 */
router.put(
  "/requests/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
    body("status").exists().isString().isIn(["accepted", "declined"]),
  ]),
  friendController.reactFriendRequest
);

/**
 * @route DELETE /friends/requests/:id
 * @description Cancel a friend request
 * @access Login required
 */
router.delete(
  "/requests/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  friendController.cancelFriendRequest
);

/**
 * @route GET /friends
 * @description Get the list of friends
 * @access Login required
 */
router.get("/", authMiddleware.loginRequired, friendController.getFriendList);

/**
 * @route DELETE /friends/:id
 * @description Remove a friend
 * @access Login required
 */
router.delete(
  "/:id",
  authMiddleware.loginRequired,
  validators.validate([
    param("id").exists().isString().custom(validators.checkObjectId),
  ]),
  friendController.removeFriend
);

module.exports = router;
