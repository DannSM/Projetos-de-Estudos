const assert = require("assert");
const path = require("path");

const { calculateTrackStatus, reconcileTrackProgress } = require(path.join(
  __dirname,
  "..",
  "src",
  "learning-progress-status.js"
));

const steps = [
  ["step-1", "sql-essencial-filtros-where"],
  ["step-2", "sql-essencial-count-nulos-distintos"],
  ["step-3", "sql-essencial-filtro-antes-agregacao"],
  ["step-4", "sql-essencial-group-by"],
  ["step-5", "sql-essencial-join"]
].map(([id, practiceSlug], index) => ({
  id,
  status: "active",
  display_order: index + 1,
  metadata: { practice_slug: practiceSlug }
}));

const activities = steps.map((step, index) => ({
  activity_id: `activity-${index + 1}`,
  exercise_id: `exercise-${index + 1}`,
  dataset_id: `dataset-${index + 1}`,
  slug: step.metadata.practice_slug,
  status: "active"
}));

function run() {
  const daniellyssonWithoutAttempts = calculateTrackStatus({ steps, activities, attempts: [] });
  assert.strictEqual(daniellyssonWithoutAttempts.isVerifiable, true);
  assert.strictEqual(daniellyssonWithoutAttempts.isCompleted, false);
  assert.strictEqual(daniellyssonWithoutAttempts.progressPercent, 0);
  assert.strictEqual(daniellyssonWithoutAttempts.nextStep.id, "step-1");

  const adminWithFiveCorrectAttempts = calculateTrackStatus({
    steps,
    activities,
    attempts: activities.map((activity) => ({
      activity_id: activity.activity_id,
      validation_status: "correct"
    }))
  });
  assert.strictEqual(adminWithFiveCorrectAttempts.isCompleted, true);
  assert.strictEqual(adminWithFiveCorrectAttempts.isVerifiable, true);
  assert.strictEqual(adminWithFiveCorrectAttempts.completedSteps, 5);
  assert.strictEqual(adminWithFiveCorrectAttempts.progressPercent, 100);
  assert.strictEqual(adminWithFiveCorrectAttempts.nextStep, null);

  const daniellysson08WithPartialAttempt = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "partial" }]
  });
  assert.strictEqual(daniellysson08WithPartialAttempt.isCompleted, false);
  assert.strictEqual(daniellysson08WithPartialAttempt.progressPercent, 0);
  assert.strictEqual(daniellysson08WithPartialAttempt.nextStep.id, "step-1");

  const oneCorrectAttempt = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }]
  });
  assert.strictEqual(oneCorrectAttempt.isCompleted, false);
  assert.strictEqual(oneCorrectAttempt.progressPercent, 20);
  assert.strictEqual(oneCorrectAttempt.nextStep.id, "step-2");

  const persistedContinuation = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }],
    progressRows: [
      { step_id: "step-1", status: "completed", progress_percent: 20 },
      { step_id: "step-2", status: "in_progress", progress_percent: 20 }
    ]
  });
  assert.strictEqual(persistedContinuation.nextStep.id, "step-2");
  assert.strictEqual(persistedContinuation.unavailableNextStep, null);

  const persistedInProgressPriority = calculateTrackStatus({
    steps,
    activities,
    attempts: [],
    progressRows: [{ step_id: "step-2", status: "in_progress", progress_percent: 0 }]
  });
  assert.strictEqual(persistedInProgressPriority.nextStep.id, "step-2");

  const intermediateProgress = calculateTrackStatus({
    steps,
    activities,
    attempts: activities.slice(0, 3).map((activity) => ({
      activity_id: activity.activity_id,
      validation_status: "correct"
    }))
  });
  assert.strictEqual(intermediateProgress.progressPercent, 60);
  assert.strictEqual(intermediateProgress.nextStep.id, "step-4");
  assert.strictEqual(intermediateProgress.completedStepIds.has("step-2"), true);

  const unavailableActivity = calculateTrackStatus({
    steps,
    activities: activities.map((activity) => (
      activity.slug === "sql-essencial-count-nulos-distintos"
        ? { ...activity, exercise_id: null, dataset_id: null }
        : activity
    )),
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }],
    progressRows: [{ step_id: "step-2", status: "in_progress", progress_percent: 20 }]
  });
  assert.strictEqual(unavailableActivity.nextStep, null);
  assert.strictEqual(unavailableActivity.unavailableNextStep.id, "step-2");

  const loadingState = calculateTrackStatus({ steps: null, activities: null, attempts: null });
  assert.strictEqual(loadingState.isVerifiable, false);
  assert.strictEqual(loadingState.nextStep, null);
  assert.strictEqual(loadingState.unavailableNextStep, null);

  const unmappedTrack = calculateTrackStatus({
    steps: [{ id: "lesson-1", status: "active", metadata: {} }],
    activities: [],
    attempts: []
  });
  assert.strictEqual(unmappedTrack.isVerifiable, false);
  assert.strictEqual(unmappedTrack.isCompleted, false);
  assert.strictEqual(unmappedTrack.requiredSteps, 1);

  const existingUnmappedProgress = {
    path_id: "path-without-practices",
    status: "completed",
    progress_percent: 100
  };
  assert.strictEqual(
    reconcileTrackProgress(existingUnmappedProgress, unmappedTrack),
    existingUnmappedProgress
  );

  const partiallyMappedTrack = calculateTrackStatus({
    steps: [steps[0], { id: "lesson-2", status: "active", metadata: {} }],
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }]
  });
  assert.strictEqual(partiallyMappedTrack.isVerifiable, false);
  assert.strictEqual(
    reconcileTrackProgress(existingUnmappedProgress, partiallyMappedTrack),
    existingUnmappedProgress
  );

  const reconciledLegacyProgress = reconcileTrackProgress(
    { path_id: "path-sql", status: "completed", progress_percent: 100 },
    daniellyssonWithoutAttempts
  );
  assert.strictEqual(reconciledLegacyProgress.status, "in_progress");
  assert.strictEqual(reconciledLegacyProgress.progress_percent, 0);

  console.log("Learning progress status tests passed");
}

run();
