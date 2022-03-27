const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const postController = {};

postController.getPosts = catchAsync(async (req, res, next) => {
  let { page, limit, sortBy, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const totalPosts = await Post.countDocuments({
    ...filter,
    isDeleted: false,
  });
  const totalPages = Math.ceil(totalPosts / limit);
  const offset = limit * (page - 1);

  const posts = await Post.find(filter)
    .sort({ ...sortBy, createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate("author");

  return sendResponse(res, 200, true, { posts, totalPages }, null, "");
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
  const { title, content, images } = req.body;

  const post = await Post.create({
    title,
    content,
    author,
    images,
  });

  return sendResponse(res, 200, true, post, null, "Create new post successful");
});

postController.updateSinglePost = catchAsync(async (req, res, next) => {
  const author = req.userId;
  const postId = req.params.id;
  const { title, content } = req.body;

  const post = await Post.findOneAndUpdate(
    { _id: postId, author: author },
    { title, content },
    { new: true }
  );

  if (!post)
    throw new AppError(
      400,
      "Post not found or User not authorized",
      "Update Post Error"
    );

  return sendResponse(res, 200, true, post, null, "Update Post successful");
});

postController.getCommentsOfPost = catchAsync(async (req, res, next) => {
  const postId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const post = Post.findById(postId);
  if (!post)
    throw new AppError(404, "Post not found", "Create New Comment Error");

  const totalComments = await Comment.countDocuments({ post: postId });
  const totalPages = Math.ceil(totalComments / limit);
  const offset = limit * (page - 1);

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(res, 200, true, { comments, totalPages }, null, "");
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

  return sendResponse(res, 200, true, null, null, "Delete Post successful");
});

module.exports = postController;
