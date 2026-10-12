(function initLearningProgressStatus(globalScope) {
  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function getPracticeSlug(step) {
    return String(step?.metadata?.practice_slug || step?.metadata?.activity_slug || "").trim();
  }

  function getActivityId(activity) {
    return activity?.activity_id || activity?.id || null;
  }

  function isActivityAvailable(activity) {
    if (!getActivityId(activity)) return false;

    const status = String(activity?.status || "active").toLowerCase();
    if (["coming_soon", "draft", "locked"].includes(status)) return false;

    const hasSqlContentFields = Object.prototype.hasOwnProperty.call(activity, "exercise_id")
      || Object.prototype.hasOwnProperty.call(activity, "dataset_id");
    return !hasSqlContentFields || Boolean(activity.exercise_id && activity.dataset_id);
  }

  function isStepAvailable(step, activityBySlug) {
    if (String(step?.content_url || "").trim()) return true;

    const format = String(step?.metadata?.format || step?.metadata?.activity_format || "").trim();
    if (format === "guided_practice") return Boolean(getPracticeSlug(step));

    return isActivityAvailable(activityBySlug.get(getPracticeSlug(step)));
  }

  function calculateTrackStatus({ steps, activities, attempts, progressRows }) {
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
    const progressByStepId = new Map(
      normalizeList(progressRows)
        .filter((progress) => progress?.step_id)
        .map((progress) => [progress.step_id, progress])
    );

    activeSteps.forEach((step) => {
      const activity = activityBySlug.get(getPracticeSlug(step));
      const activityId = getActivityId(activity);
      if (activityId && correctActivityIds.has(activityId)) {
        completedStepIds.add(step.id);
      }
    });

    const requiredSteps = allActiveSteps.length;
    const completedSteps = completedStepIds.size;
    const progressPercent = requiredSteps
      ? Math.round((completedSteps / requiredSteps) * 100)
      : 0;
    const incompleteSteps = activeSteps.filter((step) => !completedStepIds.has(step.id));
    const inProgressStep = incompleteSteps.find((step) => (
      progressByStepId.get(step.id)?.status === "in_progress"
      && isStepAvailable(step, activityBySlug)
    )) || null;
    const firstIncompleteStep = incompleteSteps[0] || null;
    const nextStep = inProgressStep
      || (firstIncompleteStep && isStepAvailable(firstIncompleteStep, activityBySlug)
        ? firstIncompleteStep
        : null);

    return {
      isVerifiable,
      isCompleted: isVerifiable && completedSteps === requiredSteps,
      progressPercent,
      requiredSteps,
      completedSteps,
      completedStepIds,
      nextStep,
      unavailableNextStep: firstIncompleteStep && !nextStep ? firstIncompleteStep : null
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

  const api = {
    calculateTrackStatus,
    getActivityId,
    getPracticeSlug,
    isActivityAvailable,
    reconcileTrackProgress
  };
  globalScope.learningProgressStatus = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
