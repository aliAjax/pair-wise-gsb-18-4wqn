import type { StageId } from "../types";

/**
 * FDI 两位牙位：
 * 象限 1=右上颌 2=左上颌 3=左下颌 4=右下颌
 * 牙位 1-8 从中切牙到第三磨牙
 */
export interface ToothMeta {
  number: string;
  label: string;
}

const TOOTH_LABELS: Record<number, string> = {
  1: "中切牙",
  2: "侧切牙",
  3: "尖牙",
  4: "第一前磨牙",
  5: "第二前磨牙",
  6: "第一磨牙",
  7: "第二磨牙",
  8: "第三磨牙",
};

/** 上颌从患者右上到左上：象限1（8→1）再接象限2（1→8），按门诊牙位图习惯排列 */
export const UPPER_ARCH: ToothMeta[] = buildArch(1, 2);
/** 下颌：象限4（8→1）再接象限3（1→8） */
export const LOWER_ARCH: ToothMeta[] = buildArch(4, 3);

function buildArch(rightQuadrant: number, leftQuadrant: number): ToothMeta[] {
  const out: ToothMeta[] = [];
  for (let t = 8; t >= 1; t--) {
    out.push({ number: `${rightQuadrant}${t}`, label: TOOTH_LABELS[t] });
  }
  for (let t = 1; t <= 8; t++) {
    out.push({ number: `${leftQuadrant}${t}`, label: TOOTH_LABELS[t] });
  }
  return out;
}

export const ALL_TEETH: ToothMeta[] = [...UPPER_ARCH, ...LOWER_ARCH];

export function isValidTooth(n: string): boolean {
  return ALL_TEETH.some((t) => t.number === n);
}

export function toothLabel(n: string): string {
  return TOOTH_LABELS[Number(n[1])] ?? n;
}

export const STAGE_ORDER: StageId[] = [
  "access",
  "measure",
  "prepare",
  "irrigate",
  "medicate",
  "fill",
];

export const STAGE_LABELS: Record<StageId, string> = {
  access: "开髓",
  measure: "测长",
  prepare: "预备",
  irrigate: "冲洗",
  medicate: "封药",
  fill: "充填",
};

export const STAGE_HINTS: Record<StageId, string> = {
  access: "记录开髓情况、髓腔暴露方式",
  measure: "每根根管的工作长度须单独保存，全部完成才能进入预备",
  prepare: "记录主尖锉号、预备方式（如机用 ProTaper）",
  irrigate: "记录冲洗液与冲洗量（如次氯酸钠 / 生理盐水）",
  medicate: "记录封药（如氢氧化钙）及暂封材料",
  fill: "根充完成后病例锁定；如需返修必须填写返修原因",
};

/** 各牙位默认根管模板（临床常见形态，可随后增删改名） */
export function defaultCanalsFor(toothNumber: string): string[] {
  const position = Number(toothNumber[1]);
  const isMolar = position >= 6;
  const isPremolar = position === 4 || position === 5;
  if (isMolar) {
    // 下颌磨牙近中两根 + 远中；上颌磨牙 MB/DB/P
    return toothNumber[0] === "3" || toothNumber[0] === "4"
      ? ["近颊", "近舌", "远中"]
      : ["MB", "DB", "P"];
  }
  if (isPremolar) {
    // 上颌第一前磨牙常为双根管，其余默认单根管
    return toothNumber === "14" || toothNumber === "24" ? ["B", "P"] : ["单根管"];
  }
  return ["单根管"];
}
