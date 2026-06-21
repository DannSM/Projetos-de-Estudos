const assert = require("assert");
const path = require("path");

const { calculateTrackStatus } = require(path.join(
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
  id: `activity-${index + 1}`,
  slug: step.metadata.practice_slug
}));

function run() {
  const legacyWithoutAttempts = calculateTrackStatus({ steps, activities, attempts: [] });
  assert.strictEqual(legacyWithoutAttempts.isCompleted, false);
  assert.strictEqual(legacyWithoutAttempts.progressPercent, 0);
  assert.strictEqual(legacyWithoutAttempts.nextStep.id, "step-1");

  const validCompletedTrack = calculateTrackStatus({
    steps,
    activities,
    attempts: activities.map((activity) => ({
      activity_id: activity.id,
      validation_status: "correct"
    }))
  });
  assert.strictEqual(validCompletedTrack.isCompleted, true);
  assert.strictEqual(validCompletedTrack.completedSteps, 5);
  assert.strictEqual(validCompletedTrack.progressPercent, 100);
  assert.strictEqual(validCompletedTrack.nextStep, null);

  const partialAttempt = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "partial" }]
  });
  assert.strictEqual(partialAttempt.isCompleted, false);
  assert.strictEqual(partialAttempt.progressPercent, 0);
  assert.strictEqual(partialAttempt.nextStep.id, "step-1");

  const oneCorrectAttempt = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }]
  });
  assert.strictEqual(oneCorrectAttempt.isCompleted, false);
  assert.strictEqual(oneCorrectAttempt.progressPercent, 20);
  assert.strictEqual(oneCorrectAttempt.nextStep.id, "step-2");

  const unmappedTrack = calculateTrackStatus({
    steps: [{ id: "lesson-1", status: "active", metadata: {} }],
    activities: [],
    attempts: []
  });
  assert.strictEqual(unmappedTrack.isCompleted, false);
  assert.strictEqual(unmappedTrack.requiredSteps, 0);

  console.log("Learning progress status tests passed");
}

run();
