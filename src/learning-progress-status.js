(function initLearningProgressStatus(globalScope) {
  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function getPracticeSlug(step) {
    return String(step?.metadata?.practice_slug || step?.metadata?.activity_slug || "").trim();
  }

  function calculateTrackStatus({ steps, activities, attempts }) {
    const activeSteps = normalizeList(steps)
      .filter((step) => step?.status === "active" && getPracticeSlug(step))
      .sort((left, right) => Number(left.display_order || 0) - Number(right.display_order || 0));
    const activityBySlug = new Map(
      normalizeList(activities).map((activity) => [String(activity?.slug || ""), activity])
    );
    const correctActivityIds = new Set(
      normalizeList(attempts)
        .filter((attempt) => attempt?.validation_status === "correct")
        .map((attempt) => attempt.activity_id)
        .filter(Boolean)
    );
    const completedStepIds = new Set();

    activeSteps.forEach((step) => {
      const activity = activityBySlug.get(getPracticeSlug(step));
      if (activity?.id && correctActivityIds.has(activity.id)) {
        completedStepIds.add(step.id);
      }
    });

    const requiredSteps = activeSteps.length;
    const completedSteps = completedStepIds.size;
    const progressPercent = requiredSteps
      ? Math.round((completedSteps / requiredSteps) * 100)
      : 0;

    return {
      isCompleted: requiredSteps > 0 && completedSteps === requiredSteps,
      progressPercent,
      requiredSteps,
      completedSteps,
      completedStepIds,
      nextStep: activeSteps.find((step) => !completedStepIds.has(step.id)) || null
    };
  }

  const api = { calculateTrackStatus, getPracticeSlug };
  globalScope.learningProgressStatus = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
