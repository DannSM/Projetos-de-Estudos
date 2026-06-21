const assert = require("assert");
const fs = require("fs");
const path = require("path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function run() {
  const home = read("src/learning-paths.js");
  const progress = read("src/progress-page.js");
  const practiceService = read("src/sql-practice-service.js");
  const progressStatus = read("src/learning-progress-status.js");
  const practicePage = read("src/sql-practice-page.js");
  const indexHtml = read("index.html");
  const practiceHtml = read("praticas-sql.html");

  assert.match(home, /attempts: "user_practice_attempts"/);
  assert.match(home, /verifiedTrackStatusByPath/);
  assert.match(home, /verifiedTrack\?\.isVerifiable/);
  assert.match(home, /\.eq\("validation_status", "correct"\)/);
  assert.match(home, /vw_sql_practice_exercises_public/);
  assert.doesNotMatch(home, /activities: "learning_activities"/);

  assert.match(progress, /activeLearningProgress \|\| completedLearningProgress/);
  assert.match(progress, /\.from\("vw_sql_practice_exercises_public"\)/);
  assert.doesNotMatch(progress, /\.from\("learning_activities"\)/);
  assert.match(progress, /if \(path\?\.id\) \{\s*verifiedTrack = await verifyCompletedTrack/);
  assert.doesNotMatch(progress, /if \(selectedCompletedCandidate && path\?\.id\)/);

  const loadUserStateSource = practiceService.slice(
    practiceService.indexOf("async function loadUserState"),
    practiceService.indexOf("async function saveQueryRun")
  );
  assert.doesNotMatch(loadUserStateSource, /TABLES\.learningProgress/);
  assert.match(loadUserStateSource, /TABLES\.attempts/);
  assert.match(loadUserStateSource, /validation_status/);
  assert.match(loadUserStateSource, /calculateTrackStatus/);
  assert.match(loadUserStateSource, /TABLES\.publicExercises/);
  assert.doesNotMatch(loadUserStateSource, /TABLES\.activities/);
  assert.match(practiceService, /status: row\.status === "coming_soon" \? "soon" : "active"/);
  assert.match(progressStatus, /activity\?\.activity_id \|\| activity\?\.id/);

  assert.doesNotMatch(practicePage, /practice\.status === "completed"/);
  assert.doesNotMatch(practicePage, /validada local/);
  assert.match(practicePage, /if \(status === "completed"\) return "concluída"/);
  assert.doesNotMatch(practicePage, /PRACTICE_VALIDATION_STORAGE|sql-practice-validation/);

  const indexHelper = indexHtml.indexOf("learning-progress-status.js");
  const indexConsumer = indexHtml.indexOf("learning-paths.js");
  assert.ok(indexHelper >= 0 && indexHelper < indexConsumer);

  const practiceHelper = practiceHtml.indexOf("learning-progress-status.js");
  const practiceConsumer = practiceHtml.indexOf("sql-practice-service.js");
  assert.ok(practiceHelper >= 0 && practiceHelper < practiceConsumer);

  console.log("Unified SQL progress read tests passed");
}

run();
