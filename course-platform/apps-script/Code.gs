const SHARED_SECRET = 'drivemaster-2026-super-secret';
const SHEETS = {
  registrations: 'registrations',
  users: 'users',
  exams: 'exams',
  questions: 'questions',
  results: 'exam_results',
  visits: 'visits',
  lessons: 'lessons',
  lessonQuestions: 'lesson_questions',
  lessonAttempts: 'lesson_attempts',
  lessonWatches: 'lesson_watches',
  simulationExams: 'simulation_exams',
  simulationClips: 'simulation_clips',
  simulationAttempts: 'simulation_attempts'
};

function doGet(e) {
  return handleRequest_(e.parameter || {});
}

function doPost(e) {
  const payload = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  return handleRequest_(payload);
}

function handleRequest_(payload) {
  try {
    if ((payload.secret || '') !== SHARED_SECRET) {
      throw new Error('Unauthorized');
    }

    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'createRegistration':
        return json_({ success: true, data: appendRow_(ss, SHEETS.registrations, payload) });
      case 'getUsers':
        return json_({ success: true, data: readSheet_(ss, SHEETS.users) });
      case 'createUser':
        return json_({ success: true, data: appendRow_(ss, SHEETS.users, payload) });
      case 'getExams':
        return json_({ success: true, data: readSheet_(ss, SHEETS.exams) });
      case 'getQuestionsByExam':
        return json_({ success: true, data: readSheet_(ss, SHEETS.questions).filter((row) => row.exam_id === payload.exam_id) });
      case 'saveExamResult':
        return json_({ success: true, data: appendRow_(ss, SHEETS.results, payload) });
      case 'getResults':
        return json_({ success: true, data: readSheet_(ss, SHEETS.results) });
      case 'trackVisit':
        return json_({ success: true, data: appendRow_(ss, SHEETS.visits, payload) });
      case 'getStats':
        return json_({ success: true, data: buildStats_(ss, payload) });
      case 'upsertExam':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.exams, 'id', payload) });
      case 'deleteExam':
        deleteByField_(ss, SHEETS.exams, 'id', payload.id);
        deleteByField_(ss, SHEETS.questions, 'exam_id', payload.id);
        return json_({ success: true });
      case 'upsertQuestion':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.questions, 'id', payload) });
      case 'deleteQuestion':
        deleteByField_(ss, SHEETS.questions, 'id', payload.id);
        return json_({ success: true });
      case 'getLessons':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.lessons).filter(
            (row) =>
              (!payload.course_type || row.course_type === payload.course_type) &&
              (String(payload.include_inactive) === 'true' || String(row.active) !== 'false')
          )
        });
      case 'getLessonQuestions':
        return json_({ success: true, data: readSheet_(ss, SHEETS.lessonQuestions).filter((row) => row.lesson_id === payload.lesson_id) });
      case 'upsertLesson':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.lessons, 'id', payload) });
      case 'deleteLesson':
        deleteByField_(ss, SHEETS.lessons, 'id', payload.id);
        deleteByField_(ss, SHEETS.lessonQuestions, 'lesson_id', payload.id);
        deleteByField_(ss, SHEETS.lessonAttempts, 'lesson_id', payload.id);
        deleteByField_(ss, SHEETS.lessonWatches, 'lesson_id', payload.id);
        return json_({ success: true });
      case 'upsertLessonQuestion':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.lessonQuestions, 'id', payload) });
      case 'deleteLessonQuestion':
        deleteByField_(ss, SHEETS.lessonQuestions, 'id', payload.id);
        return json_({ success: true });
      case 'getLessonAttempts':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.lessonAttempts).filter((row) => !payload.user_id || row.user_id === payload.user_id)
        });
      case 'saveLessonAttempt':
        return json_({ success: true, data: appendRow_(ss, SHEETS.lessonAttempts, payload) });
      case 'getLessonWatches':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.lessonWatches).filter((row) => !payload.user_id || row.user_id === payload.user_id)
        });
      case 'markLessonWatched': {
        const existing = readSheet_(ss, SHEETS.lessonWatches).find(
          (row) => row.user_id === payload.user_id && row.lesson_id === payload.lesson_id
        );
        if (existing) {
          return json_({ success: true, data: existing });
        }
        return json_({ success: true, data: appendRow_(ss, SHEETS.lessonWatches, payload) });
      }
      case 'getSimulationExams':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.simulationExams).filter(
            (row) =>
              (!payload.course_type || row.course_type === payload.course_type) &&
              (String(payload.include_inactive) === 'true' || String(row.active) !== 'false')
          )
        });
      case 'upsertSimulationExam':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.simulationExams, 'id', payload) });
      case 'deleteSimulationExam':
        deleteByField_(ss, SHEETS.simulationExams, 'id', payload.id);
        deleteByField_(ss, SHEETS.simulationClips, 'exam_id', payload.id);
        deleteByField_(ss, SHEETS.simulationAttempts, 'exam_id', payload.id);
        return json_({ success: true });
      case 'getSimulationClips':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.simulationClips)
            .filter(
              (row) =>
                row.exam_id === payload.exam_id &&
                (String(payload.include_inactive) === 'true' || String(row.active) !== 'false')
            )
        });
      case 'upsertSimulationClip':
        return json_({ success: true, data: upsertRow_(ss, SHEETS.simulationClips, 'id', payload) });
      case 'deleteSimulationClip':
        deleteByField_(ss, SHEETS.simulationClips, 'id', payload.id);
        return json_({ success: true });
      case 'getSimulationAttempts':
        return json_({
          success: true,
          data: readSheet_(ss, SHEETS.simulationAttempts).filter(
            (row) => (!payload.user_id || row.user_id === payload.user_id) && (!payload.exam_id || row.exam_id === payload.exam_id)
          )
        });
      case 'saveSimulationAttempt':
        return json_({ success: true, data: appendRow_(ss, SHEETS.simulationAttempts, payload) });
      default:
        return json_({ success: false, message: 'Unknown action' });
    }
  } catch (error) {
    return json_({ success: false, message: error.message });
  }
}

function readSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  return values
    .slice(1)
    .filter((row) => row.join('') !== '')
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => (item[header] = row[index]));
      return item;
    });
}

function appendRow_(ss, name, payload) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Sheet not found: ' + name);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map((header) => payload[header] || '');
  sheet.appendRow(row);
  return payload;
}

function upsertRow_(ss, name, field, payload) {
  const sheet = ss.getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const fieldIndex = headers.indexOf(field);
  const row = headers.map((header) => payload[header] || '');
  let foundIndex = -1;

  for (let index = 1; index < values.length; index += 1) {
    if (values[index][fieldIndex] === payload[field]) {
      foundIndex = index + 1;
      break;
    }
  }

  if (foundIndex === -1) {
    sheet.appendRow(row);
  } else {
    sheet.getRange(foundIndex, 1, 1, headers.length).setValues([row]);
  }

  return payload;
}

function deleteByField_(ss, name, field, value) {
  const sheet = ss.getSheetByName(name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const fieldIndex = headers.indexOf(field);
  for (let index = values.length - 1; index > 0; index -= 1) {
    if (values[index][fieldIndex] === value) {
      sheet.deleteRow(index + 1);
    }
  }
}

function buildStats_(ss, payload) {
  const from = payload.from || '';
  const course = payload.course || '';
  const registrations = readSheet_(ss, SHEETS.registrations).filter(
    (item) => (!from || String(item.created_at).slice(0, 10) >= from) && (!course || item.course_type === course)
  );
  const results = readSheet_(ss, SHEETS.results).filter((item) => !from || String(item.submitted_at).slice(0, 10) >= from);
  const students = readSheet_(ss, SHEETS.users).filter((item) => item.role === 'student');
  const visits = readSheet_(ss, SHEETS.visits).filter((item) => !from || String(item.visited_at).slice(0, 10) >= from);
  const passedCount = results.filter((item) => String(item.passed) === 'true').length;
  const failedCount = results.filter((item) => String(item.passed) !== 'true').length;

  return {
    totalVisits: visits.length,
    totalRegistrations: registrations.length,
    totalStudents: students.length,
    passedCount: passedCount,
    failedCount: failedCount,
    registrations: registrations,
    results: results,
    students: students,
    chart: {
      labels: ['Visits', 'Registrations', 'Passed', 'Failed'],
      values: [visits.length, registrations.length, passedCount, failedCount]
    }
  };
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
