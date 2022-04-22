const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const User = require("../models/User");
const Friend = require("../models/Friend");
const bcrypt = require("bcryptjs");
const userController = {};

userController.register = catchAsync(async (req, res, next) => {
  let { name, email, password } = req.body;

  let user = await User.findOne({ email });
  if (user) throw new AppError(409, "User already exists", "Register Error");

  const salt = await bcrypt.genSalt(10);
  password = await bcrypt.hash(password, salt);
  user = await User.create({
    name,
    email,
    password,
  });
  const accessToken = await user.generateToken();

  return sendResponse(
    res,
    200,
    true,
    { user, accessToken },
    null,
    "Create user successful"
  );
});

userController.updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const user = await User.findById(userId);
  if (!user)
    throw new AppError(404, "Account not found", "Update Profile Error");

  const allows = [
    "name",
    "avatarUrl",
    "coverUrl",
    "aboutMe",
    "city",
    "country",
    "company",
    "jobTitle",
    "facebookLink",
    "instagramLink",
    "linkedinLink",
    "twitterLink",
  ];
  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });

  await user.save();
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Update Profile successfully"
  );
});

userController.getUsers = catchAsync(async (req, res, next) => {
  const currentUserId = req.userId;
  let { page, limit, ...filter } = { ...req.query };

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const filterConditions = [{ isDelete: false }];
  if (filter.name) {
    filterConditions.push({
      ["name"]: { $regex: filter.name, $options: "i" },
    });
  }
  const filterCrireria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await User.countDocuments(filterCrireria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let users = await User.find(filterCrireria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  const promises = users.map(async (user) => {
    let temp = user.toJSON();
    temp.friendship = await Friend.findOne({
      $or: [
        { from: currentUserId, to: user._id },
        { from: user._id, to: currentUserId },
      ],
    });
    return temp;
  });
  const usersWithFriendship = await Promise.all(promises);

  return sendResponse(
    res,
    200,
    true,
    { users: usersWithFriendship, totalPages, count },
    null,
    ""
  );
});

userController.getSingleUser = catchAsync(async (req, res, next) => {
  const currentUserId = req.userId;
  const userId = req.params.id;

  let user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found", "Get Single User Error");

  user = user.toJSON();
  user.friendship = await Friend.findOne({
    $or: [
      { from: currentUserId, to: user._id },
      { from: user._id, to: currentUserId },
    ],
  });
  // user.friends = await Friend.find(
  //   {
  //     $or: [
  //       { from: userId, status: "accepted" },
  //       { to: userId, status: "accepted" },
  //     ],
  //   },
  //   "-_id status message updatedAt"
  // );

  return sendResponse(res, 200, true, user, null, "");
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const userId = req.userId;

  const user = await User.findById(userId);
  if (!user)
    throw new AppError(400, "User not found", "Get Current User Error");

  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get current user successful"
  );
});

module.exports = userController;
