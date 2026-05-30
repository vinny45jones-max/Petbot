export interface IntakeFacilitySeed {
  name: string;
  cityName: string;       // совпадает с Cities.nameRu для линковки в seed
  address?: string;
  phone?: string;
  legalHoldDays: number;
  isMunicipal: boolean;
}

// Контакты — заглушки уровня MVP; точные данные и сроки уточняет юрист/outreach (фаза 0).
export const intakeFacilitiesBY: IntakeFacilitySeed[] = [
  { name: 'ГУ «Фауна города» (Минск, Гурского 47)', cityName: 'Минск', address: 'ул. Гурского, 47', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Брест)', cityName: 'Брест', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Витебск)', cityName: 'Витебск', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Гомель)', cityName: 'Гомель', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Гродно)', cityName: 'Гродно', legalHoldDays: 5, isMunicipal: true },
  { name: 'Городская служба отлова (Могилёв)', cityName: 'Могилёв', legalHoldDays: 5, isMunicipal: true },
  { name: 'Служба отлова (Бобруйск)', cityName: 'Бобруйск', legalHoldDays: 5, isMunicipal: true },
  { name: 'Служба отлова (Барановичи)', cityName: 'Барановичи', legalHoldDays: 5, isMunicipal: true },
];
