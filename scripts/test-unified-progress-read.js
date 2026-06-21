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
  const practicePage = read("src/sql-practice-page.js");
  const indexHtml = read("index.html");
  const practiceHtml = read("praticas-sql.html");

  assert.match(home, /attempts: "user_practice_attempts"/);
  assert.match(home, /verifiedTrackStatusByPath/);
  assert.match(home, /verifiedTrack\?\.isVerifiable/);
  assert.match(home, /\.eq\("validation_status", "correct"\)/);

  assert.match(progress, /activeLearningProgress \|\| completedLearningProgress/);

  const loadUserStateSource = practiceService.slice(
    practiceService.indexOf("async function loadUserState"),
    practiceService.indexOf("async function saveQueryRun")
  );
  assert.doesNotMatch(loadUserStateSource, /TABLES\.learningProgress/);
  assert.match(loadUserStateSource, /TABLES\.attempts/);
  assert.match(loadUserStateSource, /validation_status/);
  assert.match(loadUserStateSource, /calculateTrackStatus/);
  assert.match(practiceService, /status: row\.status === "coming_soon" \? "soon" : "active"/);

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
