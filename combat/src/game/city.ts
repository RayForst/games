// Карта города: заведения и их точки на картинке assets/map/city.webp.

export type BuildingId = 'mine' | 'smithy' | 'shop' | 'arena' | 'healer' | 'tavern';

export interface Building {
  id: BuildingId;
  name: string;
  /** Точка на карте в долях ширины/высоты картинки (0..1). */
  x: number;
  y: number;
  /** Доступно в текущей версии игры. */
  open: boolean;
  /** Надпись на кнопке действия. */
  action: string;
  description: string;
}

export const MAP_IMAGE_SIZE = { width: 2000, height: 750 };

export const BUILDINGS: Building[] = [
  {
    id: 'mine',
    name: 'Шахта',
    x: 0.1,
    y: 0.5,
    open: true,
    action: 'Спуститься',
    description: 'Штольня на окраине. Платят за уголь, а не за красивые глаза: кредиты капают, пока ты машешь киркой.',
  },
  {
    id: 'smithy',
    name: 'Кузница',
    x: 0.27,
    y: 0.57,
    open: false,
    action: 'Закрыто',
    description: 'Кузнец Макар чинит и точит. Сейчас занят заказом для клуба, откроется позже.',
  },
  {
    id: 'shop',
    name: 'Магазин',
    x: 0.42,
    y: 0.59,
    open: true,
    action: 'Войти',
    description: 'Ломбард с решётками на окнах. Берут всё, продают дороже. Торговаться бесполезно.',
  },
  {
    id: 'arena',
    name: 'Арена',
    x: 0.6,
    y: 0.57,
    open: true,
    action: 'Войти',
    description: 'Старый зал с красными флагами. В подвале дерутся за кредиты и уважение.',
  },
  {
    id: 'healer',
    name: 'Лекарь',
    x: 0.77,
    y: 0.61,
    open: true,
    action: 'Войти',
    description: 'Зелёный фонарь над дверью. Заштопает за кредиты, бесплатно только совет не драться.',
  },
  {
    id: 'tavern',
    name: 'Пивная',
    x: 0.92,
    y: 0.65,
    open: false,
    action: 'Закрыто',
    description: 'Тёплые окна и бочки у входа. Слухи, задания и спарринг-партнёры появятся позже.',
  },
];

export const BUILDINGS_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b])) as Record<BuildingId, Building>;

/** Куда смотрит камера при первом открытии карты. */
export const CITY_START: BuildingId = 'arena';
