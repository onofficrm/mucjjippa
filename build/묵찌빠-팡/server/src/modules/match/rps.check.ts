import assert from 'node:assert/strict';
import { determineRpsWinner, randomRpsChoice } from './rps.js';

assert.equal(determineRpsWinner('ROCK', 'ROCK'), 'draw');
assert.equal(determineRpsWinner('ROCK', 'SCISSORS'), 'player1');
assert.equal(determineRpsWinner('ROCK', 'PAPER'), 'player2');
assert.equal(determineRpsWinner('PAPER', 'ROCK'), 'player1');
assert.equal(determineRpsWinner('SCISSORS', 'PAPER'), 'player1');
assert.equal(determineRpsWinner('SCISSORS', 'ROCK'), 'player2');

const choice = randomRpsChoice(42);
assert.ok(choice === 'ROCK' || choice === 'PAPER' || choice === 'SCISSORS');

console.log('rps unit checks passed');
