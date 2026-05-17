export const checkPlanExpiry = (user) => {
  if (!user?.planExpiresAt) return user;

  const now = new Date();
  const expiry = new Date(user.planExpiresAt);

  if (expiry < now) {
    user.plan = "free";
    user.aiCredits = 10;
    user.monthlyResumeLimit = 1;
    user.monthlyCoverLetterLimit = 1;
    user.pdfExportLimit = 3;
  }

  return user;
};