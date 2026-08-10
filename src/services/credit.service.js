import User from "../models/User.js";

export const reserveCredits = async (userId, cost = 1) => {
  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      aiCredits: { $gte: cost },
    },
    {
      $inc: { aiCredits: -cost },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (user) return user;

  const exists = await User.exists({ _id: userId });
  const error = new Error(
    exists
      ? `You need ${cost} AI credit${cost === 1 ? "" : "s"} for this action. Please upgrade your plan.`
      : "User not found."
  );
  error.statusCode = exists ? 403 : 404;
  throw error;
};

export const refundCredits = async (userId, cost = 1) => {
  await User.findByIdAndUpdate(userId, {
    $inc: { aiCredits: cost },
  });
};
