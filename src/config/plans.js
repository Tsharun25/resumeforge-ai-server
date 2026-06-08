export const PLAN_CONFIG = {
  free: {
    price: 0,
    aiCredits: 10,
    monthlyResumeLimit: 1,
    monthlyCoverLetterLimit: 1,
    pdfExportLimit: 3,
  },
  starter: {
    price: 199,
    aiCredits: 20,
    monthlyResumeLimit: 5,
    monthlyCoverLetterLimit: 5,
    pdfExportLimit: 10,
  },
  pro: {
    price: 499,
    aiCredits: 80,
    monthlyResumeLimit: 30,
    monthlyCoverLetterLimit: 30,
    pdfExportLimit: 50,
  },
  agency: {
    price: 999,
    aiCredits: 250,
    monthlyResumeLimit: 100,
    monthlyCoverLetterLimit: 100,
    pdfExportLimit: 200,
  },
};

export const PAID_PLAN_IDS = ["starter", "pro", "agency"];

export const getPlanConfig = (plan) => PLAN_CONFIG[plan] || PLAN_CONFIG.free;

export const applyPlanToUser = (user, plan) => {
  const config = getPlanConfig(plan);

  user.plan = plan;
  user.aiCredits = config.aiCredits;
  user.monthlyResumeLimit = config.monthlyResumeLimit;
  user.monthlyCoverLetterLimit = config.monthlyCoverLetterLimit;
  user.pdfExportLimit = config.pdfExportLimit;

  return user;
};
