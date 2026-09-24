import type { Point } from "./types";

export function findHomography(source: Point[], dest: Point[]): number[] {
  if (source.length !== 4 || dest.length !== 4) {
    throw new Error("A perspective warp needs exactly four corner pairs.");
  }
  const matrix: number[][] = [];
  const values: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const { x, y } = source[index];
    const { x: u, y: v } = dest[index];
    matrix.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    values.push(v);
  }
  const solved = solveLinearSystem(matrix, values);
  return [...solved, 1];
}

export function invertHomography(matrix: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = matrix;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) {
    throw new Error("The phone screen corners do not form a usable quad.");
  }
  const scale = 1 / det;
  return [
    (e * i - f * h) * scale,
    (c * h - b * i) * scale,
    (b * f - c * e) * scale,
    (f * g - d * i) * scale,
    (a * i - c * g) * scale,
    (c * d - a * f) * scale,
    (d * h - e * g) * scale,
    (b * g - a * h) * scale,
    (a * e - b * d) * scale,
  ];
}

export function applyHomography(matrix: number[], point: Point): Point {
  const w = matrix[6] * point.x + matrix[7] * point.y + matrix[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-12) {
    return { x: Number.NaN, y: Number.NaN };
  }
  return {
    x: (matrix[0] * point.x + matrix[1] * point.y + matrix[2]) / w,
    y: (matrix[3] * point.x + matrix[4] * point.y + matrix[5]) / w,
  };
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
  const size = values.length;
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(rows[row][pivot]) > Math.abs(rows[best][pivot])) best = row;
    }
    const swap = rows[pivot];
    rows[pivot] = rows[best];
    rows[best] = swap;
    const diag = rows[pivot][pivot];
    if (!Number.isFinite(diag) || Math.abs(diag) < 1e-12) {
      throw new Error("The phone screen corners do not form a usable quad.");
    }
    for (let col = pivot; col <= size; col += 1) {
      rows[pivot][col] /= diag;
    }
    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = rows[row][pivot];
      if (factor === 0) continue;
      for (let col = pivot; col <= size; col += 1) {
        rows[row][col] -= factor * rows[pivot][col];
      }
    }
  }
  return rows.map((row) => row[size]);
}
