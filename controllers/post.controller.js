const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Friend = require("../models/Friend");
const postController = {};

const calculatePostCount = async (userId) => {
  const postCount = await Post.countDocuments({
    author: userId,
    isDeleted: false,
  });
  await User.findByIdAndUpdate(userId, { postCount: postCount });
};

postController.getPosts = catchAsync(async (req, res, next) => {
  let { page, limit } = { ...req.query };
  const userId = req.params.userId;

  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found", "Get Posts Error");

  let userFriendIDs = await Friend.find({
    $or: [{ from: userId }, { to: userId }],
    status: "accepted",
  });
  if (userFriendIDs && userFriendIDs.length) {
    userFriendIDs = userFriendIDs.map((friend) => {
      if (friend.from._id.equals(userId)) return friend.to;
      return friend.from;
    });
  } else {
    userFriendIDs = [];
  }
  userFriendIDs = [...userFriendIDs, userId];
  console.log(userFriendIDs);

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const filterConditions = [
    { isDeleted: false },
    { author: { $in: userFriendIDs } },
  ];
  const filterCrireria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await Post.countDocuments(filterCrireria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  const posts = await Post.find(filterCrireria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("author");

  return sendResponse(res, 200, true, { posts, totalPages, count }, null, "");
});

postController.getSinglePost = catchAsync(async (req, res, next) => {
  let post = await Post.findById(req.params.id).populate("author");

  if (!post) throw new AppError(404, "Post not found", "Get Single Post Error");

  post = post.toJSON();
  post.comments = await Comment.find({ post: post._id }).populate("author");

  return sendResponse(res, 200, true, post, null, null);
});

postController.createNewPost = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const { content, image } = req.body;

  let post = await Post.create({
    content,
    author,
    image,
  });
  await calculatePostCount(author);
  post = await post.populate("author");

  return sendResponse(res, 200, true, post, null, "Create new post successful");
});

postController.updateSinglePost = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const postId = req.params.id;

  const post = await Post.findById(postId);
  if (!post) throw new AppError(404, "Post not found", "Update Post Error");
  if (!post.author.equals(author))
    throw new AppError(400, "Only author can edit post", "Update Post Error");

  const allows = ["content", "image"];
  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      post[field] = req.body[field];
    }
  });

  await post.save();
  return sendResponse(res, 200, true, post, null, "Update Post successful");
});

postController.getCommentsOfPost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const post = Post.findById(postId);
  if (!post)
    throw new AppError(404, "Post not found", "Create New Comment Error");

  const count = await Comment.countDocuments({ post: postId });
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("author");

  return sendResponse(
    res,
    200,
    true,
    { comments, totalPages, count },
    null,
    ""
  );
});

postController.deleteSinglePost = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const postId = req.params.id;

  const post = await Post.findOneAndUpdate(
    { _id: postId, author: author },
    { isDeleted: true },
    { new: true }
  );

  if (!post)
    throw new AppError(
      400,
      "Post not found or User not authorized",
      "Delete Post Error"
    );

  await calculatePostCount(author);

  return sendResponse(res, 200, true, post, null, "Delete Post successful");
});

module.exports = postController;
