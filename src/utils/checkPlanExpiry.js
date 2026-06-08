import { applyPlanToUser } from "../config/plans.js";

export const checkPlanExpiry = (user) => {
  if (!user?.planExpiresAt) return user;

  const now = new Date();
  const expiry = new Date(user.planExpiresAt);

  if (expiry < now) {
    applyPlanToUser(user, "free");
    user.planExpiresAt = null;
  }

  return user;
};
