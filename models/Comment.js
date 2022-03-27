const mongoose = require("mongoose");
const Post = require("./Post");

const Schema = mongoose.Schema;

const commentSchema = Schema(
  {
    content: { type: String, required: true },
    author: { type: Schema.ObjectId, required: true, ref: "User" },
    post: { type: Schema.ObjectId, required: true, ref: "Blog" },
    reactions: {
      like: { type: Number, default: 0 },
      dislike: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

commentSchema.statics.calculateReviews = async function (postId) {
  const commentCount = await this.find({ post: postId }).countDocuments();
  await Post.findByIdAndUpdate(postId, { commentCount: commentCount });
};

commentSchema.post("save", async function () {
  await this.constructor.calculateReviews(this.post);
});

// Neither findByIdAndUpdate nor findByIdAndDelete have access to document middleware.
// They only get access to query middleware
// Inside this hook, this will point to the current query, not the current comment.
// Therefore, to access the comment, we’ll need to execute the query
commentSchema.pre(/^findOneAnd/, async function (next) {
  this.doc = await this.findOne();
  next();
});

commentSchema.post(/^findOneAnd/, async function (next) {
  await this.doc.constructor.calculateReviews(this.doc.post);
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
