const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

async function readStore() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      results: Array.isArray(parsed.results) ? parsed.results : []
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const emptyStore = { exams: [], results: [] };
    await writeStore(emptyStore);
    return emptyStore;
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), 'utf8');
  await fs.rename(tempFile, DATA_FILE);
}

function publicExam(exam) {
  return {
    id: exam.id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    questionCount: exam.questions.length,
    createdAt: exam.createdAt
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Online Examination API is running' });
});

app.get('/api/exams', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json(store.exams.map(publicExam).reverse());
  } catch (error) {
    next(error);
  }
});

// Student endpoint: never send the correct answer to the browser.
app.get('/api/exams/:id', async (req, res, next) => {
  try {
    const store = await readStore();
    const exam = store.exams.find((item) => item.id === req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({
      ...publicExam(exam),
      questions: exam.questions.map(({ id, prompt, options }) => ({ id, prompt, options }))
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/exams', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const durationMinutes = Number(req.body.durationMinutes);
    const questionsInput = req.body.questions;

    if (!title) return res.status(400).json({ message: 'Enter an exam title' });
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
      return res.status(400).json({ message: 'Duration must be between 1 and 240 minutes' });
    }
    if (!Array.isArray(questionsInput) || questionsInput.length < 1) {
      return res.status(400).json({ message: 'Add at least one question' });
    }

    const questions = [];
    for (const [index, question] of questionsInput.entries()) {
      const prompt = String(question.prompt || '').trim();
      const options = Array.isArray(question.options)
        ? question.options.map((option) => String(option).trim())
        : [];
      const correctIndex = Number(question.correctIndex);
      if (!prompt || options.length < 2 || options.some((option) => !option)) {
        return res.status(400).json({ message: `Check question ${index + 1} and its options` });
      }
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        return res.status(400).json({ message: `Choose the correct answer for question ${index + 1}` });
      }
      questions.push({ id: randomUUID(), prompt, options, correctIndex });
    }

    const store = await readStore();
    const exam = {
      id: randomUUID(),
      title,
      durationMinutes,
      questions,
      createdAt: new Date().toISOString()
    };
    store.exams.push(exam);
    await writeStore(store);
    res.status(201).json({ message: 'Exam created successfully', exam: publicExam(exam) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/exams/:id/submit', async (req, res, next) => {
  try {
    const studentName = String(req.body.studentName || '').trim();
    const answers = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    if (!studentName) return res.status(400).json({ message: 'Enter your name before submitting' });

    const store = await readStore();
    const exam = store.exams.find((item) => item.id === req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    let score = 0;
    for (const question of exam.questions) {
      if (Number(answers[question.id]) === question.correctIndex) score += 1;
    }
    const total = exam.questions.length;
    const result = {
      id: randomUUID(),
      examId: exam.id,
      examTitle: exam.title,
      studentName,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      submittedAt: new Date().toISOString()
    };
    store.results.push(result);
    await writeStore(store);
    res.status(201).json({ message: 'Exam submitted successfully', result });
  } catch (error) {
    next(error);
  }
});

app.get('/api/results', async (_req, res, next) => {
  try {
    const store = await readStore();
    res.json([...store.results].reverse());
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Server error. Check the server terminal.' });
});

app.listen(PORT, () => {
  console.log(`Online Examination API running at http://localhost:${PORT}`);
  console.log(`JSON data file: ${DATA_FILE}`);
});
