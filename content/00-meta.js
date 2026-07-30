/* 미현상 — 작품 정보 / 권·부 구성 */
NOVEL.setMeta({
  title: '미현상',
  hanja: '未現像',
  subtitle: '아버지의 서른세 번째 여름',
  author: '',
  volumes: 1
});

NOVEL.addVolume({ no: 1, title: '미현상', hanja: '未現像' });

NOVEL.addPart({ id: 'p1', volume: 1, label: '제1부', title: '노출', hanja: '露出' });
NOVEL.addPart({ id: 'p2', volume: 1, label: '제2부', title: '잠상', hanja: '潛像' });
NOVEL.addPart({ id: 'p3', volume: 1, label: '제3부', title: '현상', hanja: '現像' });
NOVEL.addPart({ id: 'p4', volume: 1, label: '제4부', title: '정착', hanja: '定着' });
NOVEL.addPart({ id: 'p5', volume: 1, label: '종장', title: '수세', hanja: '水洗' });
