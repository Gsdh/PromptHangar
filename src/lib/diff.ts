// Simple line-based diff using LCS. Good enough for MVP revision comparison.

export type DiffLine = {
  kind: "same" | "add" | "del";
  text: string;
};

export function computeLineDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");

  // LCS length matrix
  const m = aLines.length;
  const n = bLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (aLines[i] === bLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aLines[i] === bLines[j]) {
      out.push({ kind: "same", text: aLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: aLines[i] });
      i++;
    } else {
      out.push({ kind: "add", text: bLines[j] });
      j++;
    }
  }
  while (i < m) {
    out.push({ kind: "del", text: aLines[i] });
    i++;
  }
  while (j < n) {
    out.push({ kind: "add", text: bLines[j] });
    j++;
  }

  // If everything is "same" and both empty, return empty array
  if (out.every((l) => l.kind === "same") && a === b) {
    return out;
  }

  return out;
}
