import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'sat-peak-practice-v2'
const MODULES = [
  { id: 'rw1', subject: 'Reading and Writing', module: 1, minutes: 32 },
  { id: 'rw2', subject: 'Reading and Writing', module: 2, minutes: 32 },
  { id: 'm1', subject: 'Math', module: 1, minutes: 35 },
  { id: 'm2', subject: 'Math', module: 2, minutes: 35 },
]

const Icon = ({ name, size = 20 }) => {
  const paths = {
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    flag: <><path d="M5 21V4"/><path d="M5 5h10l-1.5 3L15 11H5"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    reference: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5Z"/><path d="M5 4.5v17M9 7h6M9 11h6"/></>,
    pause: <><path d="M9 6v12M15 6v12"/></>,
    play: <path d="m9 7 8 5-8 5Z"/>,
    grid: <><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    back: <path d="m15 18-6-6 6-6"/>,
    reset: <><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8"/><path d="M4 4v4h4"/></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

const formatTime = (seconds) => {
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

const normalize = (value) => String(value ?? '').trim().toLowerCase().replaceAll(' ', '')

const loadSavedState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return saved?.screen && saved.screen !== 'results' ? saved : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function App() {
  const [restored] = useState(loadSavedState)
  const [questions, setQuestions] = useState([])
  const [screen, setScreen] = useState(restored?.screen ?? 'start')
  const [timed, setTimed] = useState(restored?.timed ?? true)
  const [moduleIndex, setModuleIndex] = useState(restored?.moduleIndex ?? 0)
  const [questionIndex, setQuestionIndex] = useState(restored?.questionIndex ?? 0)
  const [answers, setAnswers] = useState(restored?.answers ?? {})
  const [flagged, setFlagged] = useState(restored?.flagged ?? {})
  const [secondsLeft, setSecondsLeft] = useState(restored?.secondsLeft ?? MODULES[0].minutes * 60)
  const [paused, setPaused] = useState(false)
  const [showDirections, setShowDirections] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    fetch('/questions/questions.json')
      .then((response) => {
        if (!response.ok) throw new Error('Question bank could not be loaded.')
        return response.json()
      })
      .then((data) => setQuestions(data))
      .catch(() => setScreen('error'))
  }, [])

  const orderedByModule = useMemo(() => {
    const result = {}
    MODULES.forEach(({ id }) => {
      const selected = questions.filter((question) => question.section === id)
      result[id] = [9, 10, 11].flatMap((test) => selected.filter((question) => question.test === test))
    })
    return result
  }, [questions])

  const currentModule = MODULES[moduleIndex]
  const moduleQuestions = orderedByModule[currentModule.id] ?? []
  const currentQuestion = moduleQuestions[questionIndex]

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [screen, moduleIndex])

  useEffect(() => {
    if (!questions.length || screen === 'start' || screen === 'results') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, timed, moduleIndex, questionIndex, answers, flagged, secondsLeft }))
  }, [screen, timed, moduleIndex, questionIndex, answers, flagged, secondsLeft, questions.length])

  useEffect(() => {
    if (screen !== 'exam' || !timed || paused) return undefined
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [screen, timed, paused])

  const finishModule = () => {
    setPaused(false)
    if (moduleIndex === MODULES.length - 1) {
      setScreen('results')
      localStorage.removeItem(STORAGE_KEY)
    } else {
      setScreen('transition')
    }
  }

  useEffect(() => {
    if (screen === 'exam' && timed && secondsLeft === 0) finishModule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, screen, timed])

  const startExam = () => {
    localStorage.removeItem(STORAGE_KEY)
    setModuleIndex(0)
    setQuestionIndex(0)
    setAnswers({})
    setFlagged({})
    setSecondsLeft(MODULES[0].minutes * 60)
    setScreen('exam')
  }

  const beginNextModule = () => {
    const next = moduleIndex + 1
    setModuleIndex(next)
    setQuestionIndex(0)
    setSecondsLeft(MODULES[next].minutes * 60)
    setScreen('exam')
  }

  const setAnswer = (value) => {
    if (!currentQuestion) return
    setAnswers((state) => ({ ...state, [currentQuestion.id]: value }))
  }

  const move = (delta) => {
    const next = questionIndex + delta
    if (next >= 0 && next < moduleQuestions.length) setQuestionIndex(next)
    else if (delta > 0) finishModule()
  }

  const resetExam = () => {
    localStorage.removeItem(STORAGE_KEY)
    setScreen('start')
    setModuleIndex(0)
    setQuestionIndex(0)
    setAnswers({})
    setFlagged({})
    setSecondsLeft(MODULES[0].minutes * 60)
  }

  if (screen === 'error') return <main className="center-page"><h1>Question bank unavailable</h1><p>Run the content extraction script and reload the page.</p></main>
  if (!questions.length) return <main className="center-page"><div className="loader"/><p>Preparing the challenge set…</p></main>

  if (screen === 'start') return <StartScreen timed={timed} setTimed={setTimed} onStart={startExam} hasSaved={Boolean(localStorage.getItem(STORAGE_KEY))} />
  if (screen === 'transition') return <TransitionScreen current={currentModule} next={MODULES[moduleIndex + 1]} onContinue={beginNextModule} answered={moduleQuestions.filter((question) => answers[question.id]).length} total={moduleQuestions.length} />
  if (screen === 'results') return <Results questions={questions} answers={answers} onReset={resetExam} />

  const isChoice = ['A', 'B', 'C', 'D'].includes(currentQuestion.answer)
  const answeredCount = moduleQuestions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== '').length

  return (
    <div className="exam-shell">
      <header className="topbar">
        <div className="brand">SAT Peak Practice</div>
        <div className="module-title">{currentModule.subject} <span>•</span> Module {currentModule.module}</div>
        <div className="top-actions">
          {timed && <div className={`timer ${secondsLeft < 180 ? 'urgent' : ''}`}><Icon name="clock"/><span>{formatTime(secondsLeft)}</span></div>}
          <button className="header-button" onClick={() => setShowDirections(true)}><Icon name="info"/> <span>Directions</span></button>
          <button className="header-button" onClick={() => setShowReference(true)}><Icon name="reference"/> <span>Reference</span></button>
          <button className="header-button" onClick={() => setPaused(true)}><Icon name="pause"/> <span>Pause</span></button>
        </div>
      </header>

      <div className="mobile-utility">
        <button onClick={() => setNavOpen(true)}><Icon name="grid"/> Questions</button>
        <span>{answeredCount}/{moduleQuestions.length} answered</span>
      </div>

      <main className="exam-layout">
        <aside className={`navigator ${navOpen ? 'open' : ''}`} aria-label="Question navigator">
          <div className="navigator-heading">
            <div><span className="eyeline">Module progress</span><h2>Questions</h2></div>
            <button className="close-nav" aria-label="Close navigator" onClick={() => setNavOpen(false)}>×</button>
          </div>
          <div className="legend"><span><i className="dot current"/>Current</span><span><i className="dot answered"/>Answered</span><span><i className="dot flagged"/>Flagged</span></div>
          <div className="question-grid">
            {moduleQuestions.map((question, index) => (
              <button
                key={question.id}
                className={`${index === questionIndex ? 'current' : ''} ${answers[question.id] ? 'answered' : ''} ${flagged[question.id] ? 'flagged' : ''}`}
                aria-label={`Question ${index + 1}${flagged[question.id] ? ', flagged' : ''}${answers[question.id] ? ', answered' : ''}`}
                onClick={() => { setQuestionIndex(index); setNavOpen(false) }}
              >
                {index + 1}
                {flagged[question.id] && <span className="mini-flag">◆</span>}
              </button>
            ))}
          </div>
          <div className="navigator-summary"><strong>{answeredCount}</strong><span>of {moduleQuestions.length}<br/>answered</span></div>
        </aside>
        {navOpen && <button className="nav-scrim" aria-label="Close navigator" onClick={() => setNavOpen(false)}/>} 

        <section className="question-workspace">
          <div className="question-meta">
            <div>
              <span>Practice Test {currentQuestion.test} • Original Question {currentQuestion.originalNumber}</span>
              <span className="hard-label">Hard selection</span>
            </div>
            <span>Question {questionIndex + 1} of {moduleQuestions.length}</span>
          </div>

          <div className="question-columns">
            <div className="source-panel">
              <div className="source-heading"><span>Source excerpt</span><span>PDF page {currentQuestion.sourcePage}</span></div>
              <img src={currentQuestion.image} alt={`Practice Test ${currentQuestion.test}, ${currentQuestion.subject}, Module ${currentQuestion.module}, original question ${currentQuestion.originalNumber}`} />
            </div>
            <div className="response-panel">
              <p className="response-kicker">Your answer</p>
              <h2>{isChoice ? 'Select one response.' : 'Enter your response.'}</h2>
              {isChoice ? (
                <div className="answer-choices">
                  {['A', 'B', 'C', 'D'].map((choice) => (
                    <button key={choice} className={answers[currentQuestion.id] === choice ? 'selected' : ''} onClick={() => setAnswer(choice)}>
                      <span>{choice}</span><span>{answers[currentQuestion.id] === choice ? 'Selected' : `Choose ${choice}`}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid-response">
                  <label htmlFor="student-response">Student-produced response</label>
                  <input id="student-response" value={answers[currentQuestion.id] ?? ''} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer" inputMode="decimal" />
                  <p>Fractions and decimals are accepted. If multiple values work, enter one.</p>
                </div>
              )}
              <button className={`flag-button ${flagged[currentQuestion.id] ? 'active' : ''}`} onClick={() => setFlagged((state) => ({ ...state, [currentQuestion.id]: !state[currentQuestion.id] }))}>
                <Icon name="flag"/> {flagged[currentQuestion.id] ? 'Marked for review' : 'Mark for review'}
              </button>
              <div className="domain-note"><span>Focus area</span><strong>{currentQuestion.domain}</strong></div>
            </div>
          </div>

          <div className="bottom-nav">
            <button className="secondary" disabled={questionIndex === 0} onClick={() => move(-1)}><Icon name="back"/> Back</button>
            <button className="primary" onClick={() => move(1)}>{questionIndex === moduleQuestions.length - 1 ? 'Finish module' : 'Next'} <Icon name="chevron"/></button>
          </div>
        </section>
      </main>

      {showDirections && <Modal title="Exam directions" onClose={() => setShowDirections(false)}><ul><li>Answer each question using the source excerpt, then select A–D or enter a student-produced Math response.</li><li>You may move among questions inside the current module and mark items for review.</li><li>Answers are locked only when you finish the full challenge set.</li><li>This 108-question set contains 27 difficult selections in each module from Practice Tests 9, 10, and 11.</li></ul></Modal>}
      {showReference && <Modal title="Math reference" onClose={() => setShowReference(false)}><div className="reference-grid"><div><span>Circle</span><strong>A = πr²</strong><strong>C = 2πr</strong></div><div><span>Triangle</span><strong>A = ½bh</strong><strong>a² + b² = c²</strong></div><div><span>Rectangle</span><strong>A = lw</strong><strong>V = lwh</strong></div><div><span>Exponent rules</span><strong>aᵐaⁿ = aᵐ⁺ⁿ</strong><strong>(aᵐ)ⁿ = aᵐⁿ</strong></div></div></Modal>}
      {paused && <div className="pause-overlay"><div><Icon name="pause" size={34}/><h2>Exam paused</h2><p>Your answers and time are saved on this device.</p><button className="primary" onClick={() => setPaused(false)}><Icon name="play"/> Resume exam</button></div></div>}
    </div>
  )
}

function StartScreen({ timed, setTimed, onStart, hasSaved }) {
  return (
    <main className="start-page">
      <header className="start-header"><div className="brand dark">SAT Peak Practice</div><span>Independent challenge set</span></header>
      <section className="start-hero">
        <div className="intro">
          <p className="overline">Hardest-question mock exam</p>
          <h1>Twenty-seven per module.<br/>No easy runway.</h1>
          <p className="lede">A full four-module challenge with 108 difficult official questions selected across SAT Practice Tests 9, 10, and 11.</p>
          <div className="mode-control" role="group" aria-label="Timing mode">
            <button className={timed ? 'active' : ''} onClick={() => setTimed(true)}><Icon name="clock"/> Timed</button>
            <button className={!timed ? 'active' : ''} onClick={() => setTimed(false)}>Untimed</button>
          </div>
          <button className="start-button" onClick={onStart}>{hasSaved ? 'Resume challenge' : 'Begin challenge'} <Icon name="chevron"/></button>
        </div>
        <div className="exam-plan">
          <div className="plan-top"><span>Challenge plan</span><strong>{timed ? '2 hr 14 min' : 'No timer'}</strong></div>
          {MODULES.map((module, index) => <div className="module-row" key={module.id}><span className="module-number">0{index + 1}</span><div><strong>{module.subject}</strong><span>Module {module.module} • 27 questions</span></div><span>{timed ? `${module.minutes} min` : 'Self-paced'}</span></div>)}
          <div className="selection-note"><Icon name="info"/><p><strong>How questions were chosen</strong>Items come from the difficult end of each SAT content group, with emphasis on higher-reasoning Reading and Writing and later-module Math.</p></div>
        </div>
      </section>
      <section className="principles"><div><strong>3</strong><span>official source tests</span></div><div><strong>4 × 27</strong><span>questions by module</span></div><div><strong>108</strong><span>hard selections</span></div><div><strong>100%</strong><span>autosaved locally</span></div></section>
      <footer className="disclaimer">SAT is a registered trademark of College Board. This independent practice interface is not endorsed by College Board. Question excerpts come from the user-supplied official practice-test PDFs.</footer>
    </main>
  )
}

function TransitionScreen({ current, next, onContinue, answered, total }) {
  return <main className="transition-page"><div className="transition-card"><div className="success-mark"><Icon name="check" size={34}/></div><p className="overline">Module complete</p><h1>{current.subject} • Module {current.module}</h1><p>You answered {answered} of {total} questions. Your responses are saved.</p><div className="next-module"><span>Up next</span><strong>{next.subject} • Module {next.module}</strong><span>{next.minutes} minutes • 27 questions</span></div><button className="start-button" onClick={onContinue}>Start next module <Icon name="chevron"/></button></div></main>
}

function Results({ questions, answers, onReset }) {
  const evaluated = questions.map((question) => {
    const accepted = question.answer.split(';').map(normalize)
    return { ...question, response: answers[question.id] ?? '', correct: accepted.includes(normalize(answers[question.id])) }
  })
  const correct = evaluated.filter((question) => question.correct).length
  const rw = evaluated.filter((question) => question.subject === 'Reading and Writing')
  const math = evaluated.filter((question) => question.subject === 'Math')
  const percent = Math.round((correct / questions.length) * 100)
  const projection = Math.round((400 + 1200 * Math.pow(correct / questions.length, 0.72)) / 10) * 10
  const sectionScore = (items) => items.filter((question) => question.correct).length
  return (
    <main className="results-page">
      <header className="results-header"><div className="brand dark">SAT Peak Practice</div><button className="secondary" onClick={onReset}><Icon name="reset"/> New attempt</button></header>
      <section className="results-hero"><div><p className="overline">Challenge complete</p><h1>{correct} of {questions.length} correct</h1><p>This score reflects a deliberately difficult question set, not a standard adaptive SAT administration.</p></div><div className="score-ring" style={{ '--score': `${percent * 3.6}deg` }}><span>{percent}</span><small>hard-set index</small></div></section>
      <section className="results-grid">
        <div className="projection"><span>Unofficial challenge projection</span><strong>{projection}</strong><p>Practice-only estimate. Do not treat this as an official SAT score.</p></div>
        <div className="section-result"><span>Reading and Writing</span><strong>{sectionScore(rw)} / {rw.length}</strong><div><i style={{ width: `${sectionScore(rw) / rw.length * 100}%` }}/></div></div>
        <div className="section-result"><span>Math</span><strong>{sectionScore(math)} / {math.length}</strong><div><i style={{ width: `${sectionScore(math) / math.length * 100}%` }}/></div></div>
      </section>
      <section className="review-section"><div className="review-heading"><div><p className="overline">Answer review</p><h2>See every source and response</h2></div><p>Correct answers are revealed only after submission.</p></div><div className="review-list">{evaluated.map((question, index) => <details key={question.id}><summary><span className={`result-icon ${question.correct ? 'correct' : 'incorrect'}`}>{question.correct ? '✓' : '×'}</span><span>Question {index + 1}</span><span>Test {question.test} • {question.subject} M{question.module} • Q{question.originalNumber}</span><strong>{question.response ? `Your answer: ${question.response}` : 'Not answered'}</strong></summary><div className="review-body"><img src={question.image} alt={`Review of original question ${question.originalNumber} from Practice Test ${question.test}`} /><div><span>Correct answer</span><strong>{question.answer}</strong><p>{question.domain}</p></div></div></details>)}</div></section>
      <footer className="disclaimer">SAT is a registered trademark of College Board. This independent practice interface is not endorsed by College Board.</footer>
    </main>
  )
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><h2 id="modal-title">{title}</h2><button aria-label="Close" onClick={onClose}>×</button></div>{children}<button className="primary" onClick={onClose}>Return to exam</button></section></div>
}

export default App
