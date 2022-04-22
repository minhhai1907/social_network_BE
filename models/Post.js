const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./User");

const postSchema = Schema(
  {
    content: { type: String, required: true },
    image: { type: String, default: "" },
    author: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reactions: {
      like: { type: Number, default: 0 },
      dislike: { type: Number, default: 0 },
    },
    commentCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

postSchema.plugin(require("./plugins/isDeletedFalse"));

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
