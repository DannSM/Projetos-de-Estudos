(function initLearningProgressStatus(globalScope) {
  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function getPracticeSlug(step) {
    return String(step?.metadata?.practice_slug || step?.metadata?.activity_slug || "").trim();
  }

  function calculateTrackStatus({ steps, activities, attempts }) {
    const allActiveSteps = normalizeList(steps)
      .filter((step) => step?.status === "active")
      .sort((left, right) => Number(left.display_order || 0) - Number(right.display_order || 0));
    const activeSteps = allActiveSteps.filter((step) => getPracticeSlug(step));
    const isVerifiable = allActiveSteps.length > 0 && activeSteps.length === allActiveSteps.length;
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

    const requiredSteps = allActiveSteps.length;
    const completedSteps = completedStepIds.size;
    const progressPercent = requiredSteps
      ? Math.round((completedSteps / requiredSteps) * 100)
      : 0;

    return {
      isVerifiable,
      isCompleted: isVerifiable && completedSteps === requiredSteps,
      progressPercent,
      requiredSteps,
      completedSteps,
      completedStepIds,
      nextStep: activeSteps.find((step) => !completedStepIds.has(step.id)) || null
    };
  }

  function reconcileTrackProgress(progress, verifiedTrack) {
    if (!progress || !verifiedTrack?.isVerifiable) {
      return progress;
    }

    return {
      ...progress,
      status: verifiedTrack.isCompleted ? "completed" : "in_progress",
      progress_percent: verifiedTrack.progressPercent
    };
  }

  const api = { calculateTrackStatus, getPracticeSlug, reconcileTrackProgress };
  globalScope.learningProgressStatus = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
