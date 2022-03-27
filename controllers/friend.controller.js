const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const User = require("../models/User");
const Friend = require("../models/Friend");
const friendController = {};

friendController.sendFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // From
  const toUserId = req.body.to; // To

  const user = await User.findById(toUserId);
  if (!user)
    throw new AppError(400, "User not found", "Send Friend Request Error");

  let friend = await Friend.findOne({
    $or: [
      { from: toUserId, to: userId },
      { from: userId, to: toUserId },
    ],
  });
  if (!friend) {
    await Friend.create({
      from: userId,
      to: toUserId,
      status: "pending",
    });
    return sendResponse(res, 200, true, null, null, "Request has ben sent");
  } else {
    switch (friend.status) {
      case "pending":
        if (friend.from.equals(userId)) {
          throw new AppError(
            400,
            "You have already sent a request to this user",
            "Add Friend Error"
          );
        } else {
          throw new AppError(
            400,
            "You have received a request from this user",
            "Add Friend Error"
          );
        }

      case "accepted":
        throw new AppError(400, "Users are already friend", "Add Friend Error");

      case "declined":
        friend.from = userId;
        friend.to = toUserId;
        friend.status = "pending";
        await friend.save();
        return sendResponse(res, 200, true, null, null, "Request has ben sent");

      default:
        throw new AppError(400, "Friend status undefined", "Add Friend Error");
    }
  }
});

friendController.reactFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // To
  const { status } = req.body; // status: accepted | declined

  let friend = await Friend.findById(req.params.id);
  if (!friend)
    throw new AppError(
      404,
      "Friend Request not found",
      "React Friend Request Error"
    );

  friend.status = status;
  await friend.save();

  return sendResponse(res, 200, true, null, null, "Friend request successful");
});

friendController.getFriendList = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  const userId = req.userId;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  let friendList = await Friend.find({
    $or: [{ from: userId }, { to: userId }],
    status: "accepted",
  });

  const friendIDs = friendList.map((friend) => {
    if (friend.from._id.equals(userId)) return friend.to;
    return friend.from;
  });

  const totalFriends = await User.countDocuments({
    ...filter,
    isDeleted: false,
    _id: { $in: friendIDs },
  });
  const totalPages = Math.ceil(totalFriends / limit);
  const offset = limit * (page - 1);

  let users = await User.find({ ...filter, _id: { $in: friendIDs } })
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friend = friendList.find((friend) => {
      if (friend.from.equals(user._id) || friend.to.equals(user._id)) {
        return { status: friend.status };
      }
      return false;
    });
    return temp;
  });
  const usersWithFriends = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriends, totalPages },
    null,
    null
  );
});

friendController.getSentFriendRequestList = catchAsync(
  async (req, res, next) => {
    let { page, limit, sortBy, ...filter } = { ...req.query };
    const userId = req.userId;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let requestList = await Friend.find({
      from: userId,
      status: "pending",
    });

    const recipientIDs = requestList.map((friend) => {
      if (friend.from._id.equals(userId)) return friend.to;
      return friend.from;
    });

    const totalRequests = await User.countDocuments({
      ...filter,
      isDeleted: false,
      _id: { $in: recipientIDs },
    });
    const totalPages = Math.ceil(totalRequests / limit);
    const offset = limit * (page - 1);

    let users = await User.find({ ...filter, _id: { $in: recipientIDs } })
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const promises = users.map(async (user) => {
      let temp = user.toJSON();
      temp.friend = requestList.find((friend) => {
        if (friend.from.equals(user._id) || friend.to.equals(user._id)) {
          return { status: friend.status };
        }
        return false;
      });
      return temp;
    });
    const usersWithFriends = await Promise.all(promises);

    return sendResponse(
      res,
      200,
      true,
      { users: usersWithFriends, totalPages },
      null,
      null
    );
  }
);

friendController.getReceivedFriendRequestList = catchAsync(
  async (req, res, next) => {
    let { page, limit, sortBy, ...filter } = { ...req.query };
    const userId = req.userId;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let requestList = await Friend.find({
      to: userId,
      status: "pending",
    });

    const requesterIDs = requestList.map((friend) => {
      if (friend.from._id.equals(userId)) return friend.to;
      return friend.from;
    });

    const totalRequests = await User.countDocuments({
      ...filter,
      isDeleted: false,
      _id: { $in: requesterIDs },
    });
    const totalPages = Math.ceil(totalRequests / limit);
    const offset = limit * (page - 1);

    let users = await User.find({ ...filter, _id: { $in: requesterIDs } })
      .sort({ ...sortBy, createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const promises = users.map(async (user) => {
      let temp = user.toJSON();
      temp.friend = requestList.find((friend) => {
        if (friend.from.equals(user._id) || friend.to.equals(user._id)) {
          return { status: friend.status };
        }
        return false;
      });
      return temp;
    });
    const usersWithFriends = await Promise.all(promises);

    return sendResponse(
      res,
      200,
      true,
      { users: usersWithFriends, totalPages },
      null,
      null
    );
  }
);

friendController.cancelFriendRequest = catchAsync(async (req, res, next) => {
  const userId = req.userId; // From
  const toUserId = req.params.id; // To

  const friend = await Friend.findOneAndDelete({
    from: userId,
    to: toUserId,
    status: "pending",
  });

  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Friend request has been cancelled"
  );
});

friendController.removeFriend = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const toBeRemovedUserId = req.params.id;

  const friend = await Friend.findOneAndDelete({
    $or: [
      { from: userId, to: toBeRemovedUserId },
      { from: toBeRemovedUserId, to: userId },
    ],
    status: "accepted",
  });

  return sendResponse(res, 200, true, null, null, "Friend has been removed");
});

module.exports = friendController;
