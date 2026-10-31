// 문항 세트 모음. 기본 세트는 content/sets/의 md 파일을 그대로 넣고, 서버가 처음 쓸 때 한 번 읽는다.
import geo31 from "../content/sets/geo-3-1.md";
import geo32 from "../content/sets/geo-3-2.md";
import geo33 from "../content/sets/geo-3-3.md";
import { parseSet } from "./setfile.js";

const RAW = { "geo-3-1": geo31, "geo-3-2": geo32, "geo-3-3": geo33 };
const cache = new Map();

export const UNIT_SET = { "3-1": "geo-3-1", "3-2": "geo-3-2", "3-3": "geo-3-3" }; // 단원 → 세트
export const SET_LIST = Object.keys(RAW);
export const DEFAULT_SET = "geo-3-1";

export function builtinSet(id) {
  if (!RAW[id]) return null;
  if (!cache.has(id)) cache.set(id, { id, ...parseSet(RAW[id]) });
  return cache.get(id);
}
