const mongoose = require("mongoose");
const User = require("./User");
const Schema = mongoose.Schema;

const friendSchema = Schema(
  {
    from: { type: Schema.ObjectId, required: true, ref: "User" },
    to: { type: Schema.ObjectId, required: true, ref: "User" },
    message: {type: String},
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
    },
  },
  { timestamps: true }
);

friendSchema.statics.calculateFriendCount = async function (userId) {
  const friendCount = await this.find({
    $or: [{ from: userId }, { to: userId }],
    status: "accepted",
  }).countDocuments();
  await User.findByIdAndUpdate(userId, { friendCount: friendCount });
};

friendSchema.post("save", function () {
  this.constructor.calculateFriendCount(this.from);
  this.constructor.calculateFriendCount(this.to);
});

friendSchema.pre(/^findOneAnd/, async function (next) {
  this.doc = await this.findOne();
  next();
});

friendSchema.post(/^findOneAnd/, async function (next) {
  await this.doc.constructor.calculateFriendCount(this.doc.from);
  await this.doc.constructor.calculateFriendCount(this.doc.to);
});

const Friend = mongoose.model("Friend", friendSchema);
module.exports = Friend;
