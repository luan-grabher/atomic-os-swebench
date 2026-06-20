// Split a single CSV line into its fields.
//
// NOTE: this naive splitter does not understand quoting — it just splits on
// every comma. That is wrong for fields that contain commas, quotes, or
// newlines inside double quotes.
export function tokenizeLine(line) {
  return line.split(',');
}
