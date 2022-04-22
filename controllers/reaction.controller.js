const { AppError, catchAsync, sendResponse } = require("../helpers/utils");
const Reaction = require("../models/Reaction");
const mongoose = require("mongoose");
const reactionController = {};

const calculateReaction = async (targetId, targetType) => {
  const stats = await Reaction.aggregate([
    {
      $match: { targetId: mongoose.Types.ObjectId(targetId) },
    },
    {
      $group: {
        _id: "$targetId",
        like: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "like"] }, 1, 0],
          },
        },
        dislike: {
          $sum: {
            $cond: [{ $eq: ["$emoji", "dislike"] }, 1, 0],
          },
        },
      },
    },
  ]);
  const reactions = {
    like: (stats[0] && stats[0].like) || 0,
    dislike: (stats[0] && stats[0].dislike) || 0,
  };
  await mongoose.model(targetType).findByIdAndUpdate(targetId, { reactions });
  return reactions;
};

reactionController.saveReaction = catchAsync(async (req, res, next) => {
  const { targetType, targetId, emoji } = req.body;

  const targetObj = await mongoose.model(targetType).findById(targetId);
  if (!targetObj)
    throw new AppError(404, `${targetType} not found`, "Create Reaction Error");

  // Find the reaction of the current user
  let reaction = await Reaction.findOne({
    targetType,
    targetId,
    author: req.userId,
  });

  let message = "";
  if (!reaction) {
    await Reaction.create({ targetType, targetId, author: req.userId, emoji });
    message = "Added reaction";
  } else {
    if (reaction.emoji === emoji) {
      await reaction.delete();
      message = "Removed reaction";
    } else {
      reaction.emoji = emoji;
      await reaction.save();
      message = "Updated reaction";
    }
  }

  const reactions = await calculateReaction(targetId, targetType);

  return sendResponse(res, 200, true, reactions, null, message);
});

module.exports = reactionController;
