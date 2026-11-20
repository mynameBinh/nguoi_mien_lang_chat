import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRopePull,
  checkCatWin,
  checkTugWinner,
  clamp,
  createInitialSave,
  getCurrentQuest,
  getQuestStepProgress,
  isFireWallActive,
  judgeNoteDistance,
  reportQuestEvent,
  resolveRectCollision,
  stepSnakeHistory,
} from './rules';

test('quest progression completes q1 after playing all 4 mini-games and awards points', () => {
  const save = createInitialSave();
  assert.equal(getCurrentQuest(save)?.id, 'q1');

  reportQuestEvent(save, 'play', 'tug');
  reportQuestEvent(save, 'play', 'snake');
  reportQuestEvent(save, 'play', 'mic');
  const q1 = getCurrentQuest(save)!;
  assert.equal(getQuestStepProgress(save, q1), 3);

  const res = reportQuestEvent(save, 'play', 'cat');
  assert.equal(res.completedQuests.length, 1);
  assert.equal(res.completedQuests[0].id, 'q1');
  assert.equal(save.pts, 50);
  assert.equal(getCurrentQuest(save)?.id, 'q2');
});

test('winning 3 games completes q2 and winning tug completes q3', () => {
  const save = createInitialSave();
  // Finish q1 first
  (['tug', 'snake', 'mic', 'cat'] as const).forEach((g) => reportQuestEvent(save, 'play', g));
  assert.equal(save.pts, 50);

  reportQuestEvent(save, 'win', 'mic');
  reportQuestEvent(save, 'win', 'cat');
  const res = reportQuestEvent(save, 'win', 'tug');
  // q2 (3 wins = +100) AND q3 (win tug = +60) both complete!
  assert.equal(res.completedQuests.length, 2);
  assert.equal(save.pts, 210);
  assert.equal(getCurrentQuest(save), null);
});

test('tug rhythm note rating thresholds and rope pulling math', () => {
  assert.equal(judgeNoteDistance(0), 3);
  assert.equal(judgeNoteDistance(19.9), 3);
  assert.equal(judgeNoteDistance(25), 2);
  assert.equal(judgeNoteDistance(55), 1);
  assert.equal(judgeNoteDistance(64), null);

  let rope = 0;
  rope = applyRopePull(rope, 0, 3);
  assert.ok(rope < 0);
  assert.equal(checkTugWinner(rope, [1, 5]), 0);

  rope = clamp(applyRopePull(0.49, 1, 5), -0.5, 0.5);
  assert.equal(rope, 0.5);
  assert.equal(checkTugWinner(0, [4, 6]), 1);
});

test('resolveRectCollision prevents moving into solid obstacle while allowing sliding', () => {
  const pos = { x: 100, y: 100 };
  const rects: [number, number, number, number][] = [[120, 80, 50, 50]];
  resolveRectCollision(pos, 20, 10, rects, 12);
  // x movement collides (120 + 12 > 120), y movement is free
  assert.equal(pos.x, 100);
  assert.equal(pos.y, 110);
});

test('snake history prepends only when head moves >= minStep and caps length', () => {
  let hist = [{ x: 100, y: 100 }];
  hist = stepSnakeHistory(hist, { x: 102, y: 100 }, 5, 4);
  assert.equal(hist.length, 1);

  hist = stepSnakeHistory(hist, { x: 105, y: 100 }, 5, 4);
  assert.equal(hist.length, 2);
  assert.deepEqual(hist[0], { x: 105, y: 100 });
});

test('fire wall periodicity and cat/mouse win logic', () => {
  assert.equal(isFireWallActive(0.2, 0), true);
  assert.equal(isFireWallActive(2.0, 0), false);
  assert.equal(checkCatWin(true, 1, 0), true);
  assert.equal(checkCatWin(true, 1, 1), false);
  assert.equal(checkCatWin(false, 1, 1), true);
  assert.equal(checkCatWin(false, 2, 0), true);
});
