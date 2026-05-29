import { test, expect } from '@playwright/test';
import { parseStopBody } from '../../src/features/route-map/stops-body-parser.mjs';

const ZH_FULL = `# 柳州

## 在地遥测

- 地形: 桂中溶蚀喀斯特平原盆地
- 阶梯: 第三级阶梯
- 气候: 中亚热带季风气候
- 极境挑战: 农业基地起伏泥泞土路行驶,车载边缘 AI 摄像头防尘抖动图像补偿纠偏

## 在地共创

- 深入三都镇养殖种植基地
- 与新农人面对面技术对话
- AI 检测场景探讨

## 现场记

走进柳州·三都镇的农业养殖种植基地,与新农人面对面,开展技术行业交流。

[阅读领队日记](https://www.yuque.com/x)

## 远征日志

### 新世界

桂中喀斯特盆地·三都镇的养殖与种植基地,泥泞起伏的农业一线。

### 火种

车载边缘 AI 摄像头与六轴机械臂,把实验室级的检测能力带到鱼塘边。

### 越界

把六轴机械臂,开进了养鱼塘。

## 照片

![桂中喀斯特地貌](/heroes/karst-guangxi.webp)
`;

const ZH_MINIMAL = `## 在地遥测

- 地形: 平原
- 阶梯: 第二级阶梯
- 气候: 温带
- 极境挑战: 风沙

## 在地共创

- 活动一
`;

test('parseStopBody extracts all sections from a full zh body', () => {
  const r = parseStopBody(ZH_FULL, 'zh');
  expect(r.terrain).toBe('桂中溶蚀喀斯特平原盆地');
  expect(r.terrainStep).toBe('第三级阶梯');
  expect(r.climate).toBe('中亚热带季风气候');
  expect(r.challenge).toContain('农业基地起伏泥泞土路行驶');
  expect(r.relationStats).toEqual(['深入三都镇养殖种植基地', '与新农人面对面技术对话', 'AI 检测场景探讨']);
  expect(r.event!.summary).toContain('走进柳州');
  expect(r.event!.linkLabel).toBe('阅读领队日记');
  expect(r.event!.link).toBe('https://www.yuque.com/x');
  expect(r.expedition!.world).toContain('桂中喀斯特盆地');
  expect(r.expedition!.fire).toContain('车载边缘 AI');
  expect(r.expedition!.frontier).toBe('把六轴机械臂,开进了养鱼塘。');
  expect(r.photos).toEqual([{ src: '/heroes/karst-guangxi.webp', caption: '桂中喀斯特地貌' }]);
});

test('parseStopBody omits optional sections when absent', () => {
  const r = parseStopBody(ZH_MINIMAL, 'zh');
  expect(r.terrain).toBe('平原');
  expect(r.relationStats).toEqual(['活动一']);
  expect(r.event).toBeUndefined();
  expect(r.expedition).toBeUndefined();
  expect(r.photos).toBeUndefined();
});

test('parseStopBody throws when a required section is missing', () => {
  expect(() => parseStopBody('## 在地共创\n\n- x\n', 'zh')).toThrow(/在地遥测|Telemetry/);
});

test('parseStopBody throws when present sections are out of order', () => {
  const outOfOrder = `## 在地共创

- 活动一

## 在地遥测

- 地形: a
- 阶梯: b
- 气候: c
- 极境挑战: d
`;
  expect(() => parseStopBody(outOfOrder, 'zh')).toThrow(/out of order/i);
});

test('parseStopBody throws when telemetry label is not canonical', () => {
  const bad = `## 在地遥测

- 地形: a
- WRONG: b
- 气候: c
- 极境挑战: d

## 在地共创

- x
`;
  expect(() => parseStopBody(bad, 'zh')).toThrow(/telemetry|遥测|label/i);
});

test('parseStopBody parses en headings under bodyLocale en', () => {
  const en = `## Telemetry

- Terrain: Plain
- Step: Second Terrain Step
- Climate: Temperate
- Challenge: Sand

## Activities

- Activity one
`;
  const r = parseStopBody(en, 'en');
  expect(r.terrain).toBe('Plain');
  expect(r.relationStats).toEqual(['Activity one']);
});

test('parseStopBody tolerates CRLF line endings + a leading BOM', () => {
  const crlf = '﻿# 柳州\r\n\r\n## 在地遥测\r\n\r\n- 地形: 平原\r\n- 阶梯: 第二级阶梯\r\n- 气候: 温带\r\n- 极境挑战: 风沙\r\n\r\n## 在地共创\r\n\r\n- 活动一\r\n';
  const r = parseStopBody(crlf, 'zh');
  expect(r.terrain).toBe('平原');          // no trailing \r
  expect(r.challenge).toBe('风沙');
  expect(r.relationStats).toEqual(['活动一']);
});

test('parseStopBody throws on a duplicate telemetry label', () => {
  const dup = `## 在地遥测

- 地形: a
- 地形: b
- 气候: c
- 极境挑战: d

## 在地共创

- x
`;
  expect(() => parseStopBody(dup, 'zh')).toThrow(/duplicate telemetry label/i);
});
