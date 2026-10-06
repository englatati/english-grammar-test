import { questions } from './questions.js';
import { descriptions } from './results.js';
import { scoreAnswers } from './scoring.js';

const app = document.querySelector('#app');
let answers = Array(questions.length).fill(null);
let current = 0;
const note = 'Этот результат показывает только уровень грамматики. Он не оценивает разговорную речь, понимание английского на слух, произношение или активный словарный запас. Для точного определения общего уровня нужна дополнительная диагностика.';

function focusHeading() {
  app.querySelector('h1').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function welcome() {
  app.innerHTML = `<section class="welcome screen">
    <p class="eyebrow">Английский · первый шаг</p>
    <h1 tabindex="-1">Проверьте свою<br class="desktop-break"> грамматику английского</h1>
    <p class="lead">50 вопросов от базового уровня до B2. Тест поможет предварительно определить, насколько уверенно вы владеете английской грамматикой.</p>
    <div class="start-row"><button class="primary" id="start">Начать тест <span aria-hidden="true">→</span></button><span class="time">Примерное время: 10–15 минут</span></div>
    <div class="welcome-details"><span>50 вопросов</span><span>По одному на экран</span><span>Результат сразу</span></div>
    <p class="disclaimer">Это не полноценное определение уровня английского: тест проверяет только грамматику. Разговорную речь, понимание на слух и активный словарный запас лучше проверить отдельно.</p>
  </section>`;
  document.querySelector('#start').addEventListener('click', start);
}

function start() {
  answers = Array(questions.length).fill(null);
  current = 0;
  renderQuestion();
}

function renderQuestion() {
  const question = questions[current];
  app.innerHTML = `<section class="quiz screen">
    <div class="progress-label"><span>Вопрос ${current + 1} из ${questions.length}</span><span>${Math.round(current / questions.length * 100)}%</span></div>
    <progress max="${questions.length}" value="${current}" aria-label="Завершено вопросов">${current} из ${questions.length}</progress>
    <p class="eyebrow question-instruction">Выберите подходящий вариант</p>
    <h1 class="sentence" lang="en" tabindex="-1">${question.sentence.replace('___', '<span class="blank" aria-label="пропуск">___</span>')}</h1>
    <fieldset><legend class="sr-only">Варианты ответа</legend>${question.choices.map((choice, i) => `<label class="option"><input type="radio" name="answer" value="${i}" ${answers[current] === i ? 'checked' : ''}><span class="letter" aria-hidden="true">${'ABCD'[i]}</span><span lang="en">${choice}</span><span class="selected-mark" aria-hidden="true">✓</span></label>`).join('')}</fieldset>
    <div class="navigation"><button class="secondary" id="back" ${current === 0 ? 'disabled' : ''}><span aria-hidden="true">←</span> Назад</button><button class="primary" id="next" ${answers[current] === null ? 'disabled' : ''}>${current === questions.length - 1 ? 'Узнать результат' : 'Далее'} <span aria-hidden="true">→</span></button></div>
    <p class="quiz-hint">Можно вернуться назад и изменить ответ.</p>
  </section>`;
  app.querySelectorAll('input').forEach(input => input.addEventListener('change', () => {
    answers[current] = Number(input.value);
    document.querySelector('#next').disabled = false;
  }));
  document.querySelector('#back').addEventListener('click', () => {
    if (current > 0) { current--; renderQuestion(); }
  });
  document.querySelector('#next').addEventListener('click', () => {
    if (answers[current] === null) return;
    if (current < questions.length - 1) { current++; renderQuestion(); }
    else renderResult();
  });
  focusHeading();
}

function renderResult() {
  const { scores, level } = scoreAnswers(questions, answers);
  const labels = ['База', 'A2 grammar', 'B1 grammar', 'B2 grammar'];
  const maxima = [10, 15, 15, 10];
  app.innerHTML = `<section class="result screen">
    <p class="eyebrow">Тест завершён · 50 из 50</p>
    <p class="result-intro">Ваш ориентировочный уровень грамматики — ${level}</p>
    <h1 tabindex="-1" class="${level === 'A1 пока не сформирован' ? 'base-heading' : 'level'}">${level === 'A1 пока не сформирован' ? 'Базовая грамматика пока требует внимания' : level}</h1>
    <p class="lead result-description">${descriptions[level]}</p>
    <div class="scores">${scores.map((score, i) => `<div class="score-row"><span>${labels[i]}</span><span class="score-track" aria-hidden="true"><span style="width:${score / maxima[i] * 100}%"></span></span><strong>${score} / ${maxima[i]}</strong></div>`).join('')}</div>
    <p class="disclaimer">${note}</p>
    <button class="primary" id="restart">Пройти тест ещё раз <span aria-hidden="true">↗</span></button>
  </section>`;
  document.querySelector('#restart').addEventListener('click', start);
  focusHeading();
}

welcome();
