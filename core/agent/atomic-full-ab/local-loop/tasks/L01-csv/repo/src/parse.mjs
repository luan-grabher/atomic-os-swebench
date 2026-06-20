import { tokenizeLine } from './tokenize.mjs';

// Parse CSV text into an array of rows, each row an array of string fields.
//
// NOTE: this naive implementation splits the text on newlines first and then
// splits each line on commas. It cannot handle quoted fields that span
// commas or newlines, nor escaped double-quotes ("").
export function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.length > 0);
  return lines.map((line) => tokenizeLine(line));
}
