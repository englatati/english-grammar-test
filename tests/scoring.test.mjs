import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../questions.js';
import { determineLevel, scoreAnswers } from '../scoring.js';

test('50 questions match the revised diagnostic answer key', () => {
  // Independently transcribed key: Q6 B, Q28 C, Q45 C after clarification.
  const blocks = ['ABBBBBBABA', 'BBBABBACBABBCCA', 'ABCCABBBBCBBBAC', 'BABBCBBAAB'];
  assert.equal(questions.length, 50);
  assert.equal(questions.map(q => 'ABCD'[q.answer]).join(''), blocks.join(''));
  for (const q of questions) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices).size, 4);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3);
  }
  assert.deepEqual(scoreAnswers(questions, questions.map(q => q.answer)), { scores: [10,15,15,10], level: 'B2' });
  assert.deepEqual(scoreAnswers(questions, questions.map(q => (q.answer + 1) % 4)), { scores: [0,0,0,0], level: 'A1 пока не сформирован' });
});

test('clarified questions retain their context, choices, and single assigned key', () => {
  const revised = [
    [6, 'In your current job, ___ you work from home every day?', ['Are', 'Do', 'Does', 'Is'], 1],
    [28, 'She started studying English three years ago and is still learning it today. She ___ English ever since.', ['studied', 'is studying', 'has been studying', 'had studied'], 2],
    [45, "They've been in the kitchen with me all evening, and we're still chatting. They ___ gone to bed yet.", ['must have', 'should', "can't have", "can't"], 2],
  ];
  for (const [number, sentence, choices, answer] of revised) {
    assert.deepEqual(questions[number - 1], { sentence, choices, answer });
    const block = number <= 10 ? 0 : number <= 25 ? 1 : number <= 40 ? 2 : 3;
    for (let choice = 0; choice < 4; choice++) {
      const answers = questions.map(q => q.answer);
      answers[number - 1] = choice;
      const expected = [10, 15, 15, 10];
      if (choice !== answer) expected[block]--;
      assert.deepEqual(scoreAnswers(questions, answers).scores, expected, `Q${number}, choice ${choice}`);
    }
  }
});

test('all 30,976 possible block scores select the highest eligible level', () => {
  for (let a=0;a<=10;a++) for(let b=0;b<=15;b++) for(let c=0;c<=15;c++) for(let d=0;d<=10;d++) {
    const eligible = [
      ['A1 пока не сформирован', true],
      ['A1', a>=7],
      ['A2', a>=8 && b>=10],
      ['A2+', a>=8 && b>=10 && [8,9].includes(c)],
      ['B1', a>=8 && b>=11 && c>=10],
      ['B1+', a>=8 && b>=11 && c>=10 && [5,6].includes(d)],
      ['B2', a>=9 && b>=12 && c>=11 && d>=7],
    ];
    assert.equal(determineLevel([a,b,c,d]), eligible.filter(([,ok])=>ok).at(-1)[0], `${a},${b},${c},${d}`);
  }
});

test('failed basic blocks prevent advancement despite advanced scores', () => {
  assert.equal(determineLevel([6,15,15,10]), 'A1 пока не сформирован');
  assert.equal(determineLevel([7,15,15,10]), 'A1');
  assert.equal(determineLevel([10,9,15,10]), 'A1');
  assert.equal(determineLevel([8,10,15,10]), 'A2');
  assert.equal(determineLevel([8,12,11,7]), 'B1');
});

