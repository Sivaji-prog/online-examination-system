import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const blankQuestion = () => ({ prompt: '', options: ['', '', '', ''], correctIndex: 0 });

export default function App() {
  const [tab, setTab] = useState('student');
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [draftQuestions, setDraftQuestions] = useState([blankQuestion()]);
  const [studentName, setStudentName] = useState('');
  const [activeExam, setActiveExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(0);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    const [examData, resultData] = await Promise.all([request('/exams'), request('/results')]);
    setExams(examData);
    setResults(resultData);
  };

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const average = useMemo(() => results.length
    ? Math.round(results.reduce((sum, item) => sum + item.percentage, 0) / results.length)
    : 0, [results]);

  function showError(message) { setError(message); setNotice(''); }
  function showNotice(message) { setNotice(message); setError(''); }

  function updateQuestion(index, field, value) {
    setDraftQuestions((current) => current.map((question, i) =>
      i === index ? { ...question, [field]: value } : question));
  }

  function updateOption(questionIndex, optionIndex, value) {
    setDraftQuestions((current) => current.map((question, i) => {
      if (i !== questionIndex) return question;
      const options = question.options.map((option, j) => j === optionIndex ? value : option);
      return { ...question, options };
    }));
  }

  async function createExam(event) {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      const created = await request('/exams', {
        method: 'POST',
        body: JSON.stringify({ title: examTitle, durationMinutes: Number(duration), questions: draftQuestions })
      });
      setExamTitle(''); setDuration(30); setDraftQuestions([blankQuestion()]);
      await refresh();
      showNotice(created.message);
    } catch (err) { showError(err.message); }
  }

  async function startExam(examId) {
    if (!studentName.trim()) return showError('Enter your name before starting the exam.');
    try {
      const exam = await request(`/exams/${examId}`);
      setActiveExam(exam);
      setAnswers({});
      setSubmittedResult(null);
      setRemaining(exam.durationMinutes * 60);
      setTab('student');
      setError(''); setNotice('');
    } catch (err) { showError(err.message); }
  }

  async function submitExam() {
    if (!activeExam || submitting || submittedResult) return;
    setSubmitting(true);
    try {
      const data = await request(`/exams/${activeExam.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ studentName, answers })
      });
      setSubmittedResult(data.result);
      setActiveExam(null);
      await refresh();
      showNotice('Your responses have been submitted and evaluated.');
    } catch (err) { showError(err.message); }
    finally { setSubmitting(false); }
  }

  useEffect(() => {
    if (!activeExam || submittedResult) return undefined;
    if (remaining <= 0) {
      submitExam();
      return undefined;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [activeExam, remaining, submittedResult]);

  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">EP</div><div><strong>ExamPilot</strong><span>ONLINE EXAMINATION SYSTEM</span></div></div>
        <div className="topbar-right"><span className="live-dot" /> JSON storage connected</div>
      </header>

      <main className="container">
        <section className="hero">
          <div><p className="eyebrow">SMART • SIMPLE • PAPERLESS</p><h1>Examinations, <span>made easier.</span></h1><p className="hero-copy">Create assessments, attempt exams, and review results from one simple workspace.</p></div>
          <div className="hero-icon">✦</div>
        </section>

        <nav className="tabs" aria-label="Main navigation">
          <button className={tab === 'student' ? 'tab active' : 'tab'} onClick={() => { setTab('student'); setError(''); }}>Student Portal</button>
          <button className={tab === 'admin' ? 'tab active' : 'tab'} onClick={() => { setTab('admin'); setActiveExam(null); setError(''); }}>Administrator</button>
        </nav>

        {notice && <div className="alert success">✓ {notice}</div>}
        {error && <div className="alert error">! {error}</div>}

        {tab === 'student' && (
          <>
            {activeExam ? (
              <section className="panel exam-panel">
                <div className="exam-head"><div><p className="eyebrow">EXAM IN PROGRESS</p><h2>{activeExam.title}</h2><p className="muted">Candidate: {studentName}</p></div><div className="timer"><span>TIME LEFT</span><strong>{clock}</strong></div></div>
                <div className="progress-track"><div style={{ width: `${(Object.keys(answers).length / activeExam.questions.length) * 100}%` }} /></div>
                {activeExam.questions.map((question, index) => (
                  <article className="question-card" key={question.id}>
                    <div className="question-number">QUESTION {index + 1}</div><h3>{question.prompt}</h3>
                    <div className="options-grid">{question.options.map((option, optionIndex) => (
                      <label className={Number(answers[question.id]) === optionIndex ? 'option selected' : 'option'} key={optionIndex}>
                        <input type="radio" name={question.id} checked={Number(answers[question.id]) === optionIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} />
                        <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>
                      </label>
                    ))}</div>
                  </article>
                ))}
                <div className="submit-row"><span className="muted">{Object.keys(answers).length} of {activeExam.questions.length} answered</span><button className="primary" onClick={submitExam} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit examination'}</button></div>
              </section>
            ) : submittedResult ? (
              <section className="panel result-panel"><div className="result-icon">✓</div><p className="eyebrow">EXAMINATION COMPLETED</p><h2>Your result is ready</h2><div className="score-number">{submittedResult.percentage}<small>%</small></div><p className="muted">{submittedResult.studentName} · {submittedResult.examTitle}</p><div className="score-detail"><div><strong>{submittedResult.score}/{submittedResult.total}</strong><span>Correct answers</span></div><div><strong>{submittedResult.percentage}%</strong><span>Final score</span></div></div><button className="primary" onClick={() => { setSubmittedResult(null); setAnswers({}); }}>Back to exam list</button></section>
            ) : (
              <>
                <section className="panel candidate-panel"><div><p className="eyebrow">STUDENT ACCESS</p><h2>Welcome, candidate</h2><p className="muted">Enter your name, choose an available examination, and submit your answers.</p></div><label className="field name-field"><span>Student name</span><input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Enter your full name" /></label></section>
                <div className="section-heading"><div><p className="eyebrow">AVAILABLE ASSESSMENTS</p><h2>Choose your examination</h2></div><span className="count-pill">{exams.length} available</span></div>
                {loading ? <div className="empty-state">Loading examinations...</div> : exams.length === 0 ? <div className="empty-state"><div className="empty-icon">▤</div><h3>No examinations yet</h3><p>Ask the administrator to create an examination.</p></div> : <div className="exam-grid">{exams.map((exam) => <article className="exam-card" key={exam.id}><div className="exam-card-icon">▣</div><h3>{exam.title}</h3><div className="exam-meta"><span>◷ {exam.durationMinutes} min</span><span>▤ {exam.questionCount} questions</span></div><button className="primary full" onClick={() => startExam(exam.id)}>Start examination <span>→</span></button></article>)}</div>}
              </>
            )}
          </>
        )}

        {tab === 'admin' && (
          <>
            <div className="stats-grid"><div className="stat-card"><span>Total examinations</span><strong>{exams.length}</strong><small>Created assessments</small></div><div className="stat-card"><span>Student submissions</span><strong>{results.length}</strong><small>Completed attempts</small></div><div className="stat-card"><span>Average score</span><strong>{average}%</strong><small>Across all submissions</small></div></div>
            <section className="panel admin-panel"><div className="section-heading inside"><div><p className="eyebrow">ASSESSMENT BUILDER</p><h2>Create a new examination</h2><p className="muted">Add questions and select the correct option for automatic evaluation.</p></div></div>
              <form onSubmit={createExam}>
                <div className="form-row"><label className="field grow"><span>Examination title</span><input value={examTitle} onChange={(event) => setExamTitle(event.target.value)} placeholder="e.g. Fundamentals of Computing" required /></label><label className="field duration-field"><span>Duration (minutes)</span><input type="number" min="1" max="240" value={duration} onChange={(event) => setDuration(event.target.value)} required /></label></div>
                {draftQuestions.map((question, index) => <div className="builder-question" key={index}><div className="builder-title"><strong>Question {index + 1}</strong>{draftQuestions.length > 1 && <button type="button" className="text-button danger-text" onClick={() => setDraftQuestions((items) => items.filter((_, i) => i !== index))}>Remove</button>}</div><label className="field"><span>Question text</span><textarea value={question.prompt} onChange={(event) => updateQuestion(index, 'prompt', event.target.value)} placeholder="Type your question" required rows="2" /></label><div className="options-builder">{question.options.map((option, optionIndex) => <label className="field" key={optionIndex}><span>Option {String.fromCharCode(65 + optionIndex)}</span><input value={option} onChange={(event) => updateOption(index, optionIndex, event.target.value)} placeholder={`Enter option ${String.fromCharCode(65 + optionIndex)}`} required /></label>)}</div><label className="field correct-field"><span>Correct answer</span><select value={question.correctIndex} onChange={(event) => updateQuestion(index, 'correctIndex', Number(event.target.value))}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}</select></label></div>)}
                <div className="form-actions"><button type="button" className="secondary" onClick={() => setDraftQuestions((items) => [...items, blankQuestion()])}>+ Add question</button><button type="submit" className="primary">Create examination</button></div>
              </form>
            </section>
            <section className="panel results-panel"><div className="section-heading inside"><div><p className="eyebrow">PERFORMANCE</p><h2>Student results</h2></div><span className="count-pill">{results.length} submissions</span></div>{results.length === 0 ? <div className="empty-inline">No student submissions have been received yet.</div> : <div className="table-wrap"><table><thead><tr><th>Student</th><th>Examination</th><th>Score</th><th>Percentage</th><th>Submitted</th></tr></thead><tbody>{results.map((result) => <tr key={result.id}><td>{result.studentName}</td><td>{result.examTitle}</td><td>{result.score}/{result.total}</td><td><span className="score-pill">{result.percentage}%</span></td><td>{new Date(result.submittedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>
          </>
        )}
        <footer>ExamPilot · Online Examination System · React + Node.js + JSON file storage</footer>
      </main>
    </div>
  );
}
