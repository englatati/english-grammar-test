import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../questions.js';
import { determineLevel, scoreAnswers } from '../scoring.js';

test('50 questions match the supplied answer key', () => {
  // Compare against an independently transcribed key, grouped by hidden block.
  const blocks = ['ABBBBBBABA', 'BBBABBACBABBCCA', 'ABACABBBBCBBBAC', 'BABBBBBAAB'];
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
