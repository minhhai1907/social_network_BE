const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Comment = require("../models/Comment");
const Post = require("../models/Post");

const commentController = {};
const calculateCommentCount = async (postId) => {
  const commentCount = await Comment.countDocuments({ post: postId });
  await Post.findByIdAndUpdate(postId, { commentCount: commentCount });
};

commentController.createNewComment = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const { content, postId } = req.body;

  const post = Post.findById(postId);
  if (!post)
    throw new AppError(404, "Post not found", "Create New Comment Error");

  let comment = await Comment.create({
    author: userId,
    post: postId,
    content,
  });
  await calculateCommentCount(postId);
  comment = await comment.populate("author");

  return sendResponse(
    res,
    200,
    true,
    comment,
    null,
    "Create new comment successful"
  );
});

commentController.getSingleComment = catchAsync(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id).populate("author");

  if (!comment)
    throw new AppError(404, "Comment not found", "Get Single Comment Error");

  return sendResponse(res, 200, true, comment, null, null);
});

commentController.updateSingleComment = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const commentId = req.params.id;
  const { content } = req.body;

  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, author: userId },
    { content },
    { new: true }
  );
  if (!comment)
    throw new AppError(
      400,
      "Comment not found or User not authorized",
      "Update Comment Error"
    );

  return sendResponse(res, 200, true, comment, null, "Update successful");
});

commentController.deleteSingleComment = catchAsync(async (req, res, next) => {
  const userId = req.userId;
  const commentId = req.params.id;

  const comment = await Comment.findOneAndDelete({
    _id: commentId,
    author: userId,
  });
  if (!comment)
    throw new AppError(
      400,
      "Comment not found or User not authorized",
      "Delete Comment Error"
    );
  await calculateCommentCount(comment.post);

  return sendResponse(res, 200, true, comment, null, "Delete successful");
});

module.exports = commentController;
