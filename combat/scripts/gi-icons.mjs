// Вытаскивает SVG-пути нужных иконок из пакета react-icons (набор Game Icons, game-icons.net, CC BY 3.0)
// и пишет src/ui/gi.generated.ts. Запуск: npm run gi-icons. Список ключей и кандидатов — ниже:
// берётся первая существующая иконка из списка.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** ключ → кандидаты в порядке предпочтения */
const WANT = {
  // предметы 4–6 уровней
  flail: ['GiFlail'],
  longsword: ['GiBroadsword'],
  'war-hammer': ['GiWarhammer', 'GiThorHammer', 'GiGavel'],
  estoc: ['GiRapier', 'GiPiercingSword', 'GiStilettoSword', 'GiSwordBrandish'],
  halberd: ['GiHalberd'],
  'executioner-sword': ['GiGladius', 'GiBroadDagger', 'GiSwordBrandish'],
  'kite-shield': ['GiTemplarShield', 'GiCheckedShield', 'GiShield'],
  'steel-wall': ['GiTowerShield', 'GiBorderedShield', 'GiShield'],
  barbute: ['GiBarbute'],
  'crowned-helm': ['GiVisoredHelm', 'GiClosedBarbute', 'GiDwarfHelmet', 'GiHelmet'],
  scale: ['GiScaleMail'],
  'gothic-plate': ['GiBreastplate', 'GiChestArmor', 'GiLamellar'],
  'dragon-plate': ['GiLamellar', 'GiBreastplate', 'GiChestArmor'],
  'knight-gauntlets': ['GiGauntlet'],
  'champion-belt': ['GiBelt', 'GiChampions', 'GiWhip'],
  'plate-legs': ['GiGreaves', 'GiLegArmor'],
  'dragon-legs': ['GiLegArmor', 'GiGreaves'],
  'knight-sabatons': ['GiSteeltoeBoots', 'GiBoots'],
  // двуручное
  'wagon-shaft': ['GiWoodClub', 'GiSpikedBat'],
  poleaxe: ['GiBattleAxe', 'GiWarAxe'],
  greatsword: ['GiTwoHandedSword', 'GiBroadsword'],
  bardiche: ['GiSharpHalberd', 'GiHalberd', 'GiWarAxe'],
  maul: ['GiThorHammer', 'GiWarhammer', 'GiFlatHammer'],
  // кольца
  'copper-ring': ['GiRing'],
  'bone-ring': ['GiSkullRing', 'GiRing'],
  'iron-ring': ['GiPowerRing', 'GiRing'],
  'silver-ring': ['GiSwirlRing', 'GiRing'],
  'onyx-ring': ['GiDiamondRing', 'GiRing'],
  'garnet-ring': ['GiBigDiamondRing', 'GiDiamondRing', 'GiRing'],
  'drowned-ring': ['GiFrozenRing', 'GiRing'],
  'headsman-ring': ['GiSkullRing', 'GiRing'],
  'prince-ring': ['GiEngagementRing', 'GiRing'],
  'host-ring': ['GiFireRing', 'GiRing'],
  'dragon-ring': ['GiDoubleRingedOrb', 'GiRing'],
  // амулеты
  'wolf-fang': ['GiFangs', 'GiTooth'],
  ladanka: ['GiPendantKey', 'GiCharm', 'GiNecklace'],
  'evil-eye-charm': ['GiCharm', 'GiTribalPendant', 'GiNecklace'],
  'veteran-medallion': ['GiMedal', 'GiRibbonMedal', 'GiNecklace'],
  'tooth-necklace': ['GiPrimitiveNecklace', 'GiNecklace'],
  'host-amulet': ['GiGemPendant', 'GiGemNecklace', 'GiNecklace'],
  // пустые слоты куклы
  'slot-ring': ['GiRing'],
  'slot-amulet': ['GiNecklace'],
  // ресурсы и занятия
  herbs: ['GiHerbsBundle'],
  wood: ['GiWoodPile'],
  pelts: ['GiAnimalHide'],
  chop: ['GiWoodAxe', 'GiAxeInStump', 'GiWoodPile'],
  hunt: ['GiDeerTrack', 'GiBowArrow', 'GiWolfHead'],
  // мир
  city: ['GiVillage'],
  town: ['GiHutsVillage', 'GiTownhall', 'GiCastle', 'GiVillage'],
  caravan: ['GiCarriage', 'GiCaravan', 'GiHorseHead', 'GiCartwheel'],
  forest: ['GiPineTree'],
  swamp: ['GiSwamp'],
  ruins: ['GiCastleRuins'],
  pass: ['GiMountains'],
  castle: ['GiCastle'],
  road: ['GiPathDistance', 'GiJourney', 'GiWalkingBoot'],
  trade: ['GiTrade', 'GiShop'],
  hourglass: ['GiHourglass', 'GiSandsOfTime'],
  backpack: ['GiBackpack'],
  // новые ресурсы и занятия
  bogwort: ['GiReed'],
  relics: ['GiAmphora'],
  ore: ['GiOre'],
  dig: ['GiMining', 'GiCaveEntrance'],
  snares: ['GiWolfTrap', 'GiBearTrap'],
  potion: ['GiPotionBall'],
  craft: ['GiAnvil'],
  coins: ['GiTwoCoins'],
  event: ['GiScrollUnfurled'],
  // звери и лихие люди
  ghoul: ['GiDeathSkull'],
  dog: ['GiHound'],
  hermit: ['GiMonkFace'],
  leopard: ['GiCat'],
  drowned: ['GiDrowning'],
  marauder: ['GiBandit'],
  wolf: ['GiWolfHead'],
  boar: ['GiBoarTusks', 'GiBoar'],
  bandit: ['GiHoodedAssassin', 'GiRogue', 'GiCowled'],
  // гильдии: эмблемы и служебное
  crown: ['GiCrown', 'GiQueenCrown'],
  skull: ['GiSkullCrossedBones', 'GiDeathSkull'],
  fist: ['GiFist', 'GiPunch'],
  raven: ['GiRaven', 'GiCrow'],
  dagger: ['GiPlainDagger', 'GiDaggers', 'GiStilettoSword'],
  flame: ['GiFlame', 'GiSmallFire'],
  guild: ['GiFamilyHouse', 'GiHeraldicSun', 'GiBanner'],
  chat: ['GiConversation', 'GiTalk', 'GiDiscussion'],
  staff: ['GiWizardStaff', 'GiCrystalWand', 'GiMagicSwirl'],
  key: ['GiKey', 'GiHouseKeys'],
  // косметика и Лавка князя
  seal: ['GiWaxSeal', 'GiStamper'],
  boutique: ['GiCrownCoin', 'GiShop'],
  frame: ['GiMirrorMirror'],
  paint: ['GiPaintBrush', 'GiPalette'],
  quill: ['GiScrollQuill', 'GiQuillInk'],
  banner: ['GiFlyingFlag'],
  curtain: ['GiTheaterCurtains', 'GiRolledCloth'],
  laurels: ['GiLaurelCrown', 'GiLaurels'],
  lion: ['GiLion'],
  eagle: ['GiEagleHead'],
  dragon: ['GiDragonHead', 'GiSpikedDragonHead'],
  bear: ['GiBearHead'],
  rose: ['GiRose'],
  'crowned-skull': ['GiCrownedSkull'],
  // сундуки и календарь
  chest: ['GiLockedChest', 'GiChest'],
  'chest-open': ['GiOpenChest', 'GiOpenTreasureChest', 'GiChest'],
  calendar: ['GiCalendar', 'GiScrollUnfurled'],
};

const src = await readFile(path.join(root, 'node_modules/react-icons/gi/index.mjs'), 'utf8');
const lines = src.split('\n');
const defs = new Map();
for (let i = 0; i < lines.length; i += 1) {
  const m = /^export function (Gi\w+) \(props\)/.exec(lines[i]);
  if (!m) continue;
  const body = lines[i + 1] ?? '';
  const json = body.slice(body.indexOf('(') + 1, body.lastIndexOf(')(props)'));
  try {
    defs.set(m[1], JSON.parse(json));
  } catch {
    /* пропускаем кривые */
  }
}

function paths(node, out = []) {
  if (node.tag === 'path' && node.attr?.d) out.push(node.attr.d);
  for (const child of node.child ?? []) paths(child, out);
  return out;
}

const result = {};
const missing = [];
for (const [key, candidates] of Object.entries(WANT)) {
  const name = candidates.find((c) => defs.has(c));
  if (!name) {
    missing.push(`${key} (${candidates.join('/')})`);
    continue;
  }
  const def = defs.get(name);
  result[key] = { name, viewBox: def.attr?.viewBox ?? '0 0 512 512', paths: paths(def) };
}

const out = [
  '// Сгенерировано scripts/gi-icons.mjs из пакета react-icons — не править руками.',
  '// Иконки: Game Icons (https://game-icons.net), лицензия CC BY 3.0. Авторы перечислены в CREDITS.md.',
  '',
  'export interface GiDef {',
  '  name: string;',
  '  viewBox: string;',
  '  paths: string[];',
  '}',
  '',
  'export const GI = {',
  ...Object.entries(result).map(([k, v]) => `  '${k}': ${JSON.stringify(v)},`),
  '} as const satisfies Record<string, GiDef>;',
  '',
  'export type GiName = keyof typeof GI;',
  '',
];
await writeFile(path.join(root, 'src/ui/gi.generated.ts'), out.join('\n'));
console.log(`icons: ${Object.keys(result).length}`);
for (const [k, v] of Object.entries(result)) console.log(`  ${k} ← ${v.name}`);
if (missing.length) console.log('Не нашлось:', missing.join(', '));
