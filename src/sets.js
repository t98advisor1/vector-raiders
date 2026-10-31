// 문항 세트 모음. 기본 세트는 content/sets/의 md 파일을 그대로 넣고, 서버가 처음 쓸 때 한 번 읽는다.
import geo31 from "../content/sets/geo-3-1.md";
import { parseSet } from "./setfile.js";

const RAW = { "geo-3-1": geo31 };
const cache = new Map();

export const UNIT_SET = { "3-1": "geo-3-1" }; // 학생이 고른 단원 → 세트 (3-2, 3-3은 준비 중)
export const DEFAULT_SET = "geo-3-1";

export function builtinSet(id) {
  if (!RAW[id]) return null;
  if (!cache.has(id)) cache.set(id, { id, ...parseSet(RAW[id]) });
  return cache.get(id);
}
