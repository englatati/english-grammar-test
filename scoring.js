export function determineLevel([a1, a2, b1, b2]) {
  if (a1 >= 9 && a2 >= 12 && b1 >= 11 && b2 >= 7) return 'B2';
  if (a1 >= 8 && a2 >= 11 && b1 >= 10) {
    return b2 === 5 || b2 === 6 ? 'B1+' : 'B1';
  }
  if (a1 >= 8 && a2 >= 10) {
    return b1 === 8 || b1 === 9 ? 'A2+' : 'A2';
  }
  return a1 >= 7 ? 'A1' : 'A1 пока не сформирован';
}

export function scoreAnswers(questions, answers) {
  const scores = [0, 0, 0, 0];
  questions.forEach((question, i) => {
    if (answers[i] === question.answer) scores[i < 10 ? 0 : i < 25 ? 1 : i < 40 ? 2 : 3]++;
  });
  return { scores, level: determineLevel(scores) };
}
