export interface DemoOrgSeed { name: string; cityName: string; isVerified: boolean; isPublished: boolean }
export interface DemoAnimalSeed {
  name?: string;
  species: 'dog' | 'cat' | 'other';
  sex: 'male' | 'female' | 'unknown';
  ageYears?: number;
  size: 'small' | 'medium' | 'large';
  cityName: string;
  ownerType: 'citizen' | 'organization';
  orgName?: string;          // если ownerType=organization
  facilityName?: string;     // если из службы отлова
  intakeOffsetDays?: number; // intakeDate = today - offset (для расчёта дедлайна в демо)
  descriptionText: string;
  status: 'published';
}

export const demoOrgs: DemoOrgSeed[] = [
  { name: 'Приют «Верный друг»', cityName: 'Минск', isVerified: true, isPublished: true },
  { name: 'Кошкин дом', cityName: 'Брест', isVerified: true, isPublished: true },
];

export const demoAnimals: DemoAnimalSeed[] = [
  { name: 'Рекс', species: 'dog', sex: 'male', ageYears: 2, size: 'large', cityName: 'Минск', ownerType: 'organization', orgName: 'Приют «Верный друг»', descriptionText: 'Дружелюбный пёс, ладит с детьми.', status: 'published' },
  { name: 'Мурка', species: 'cat', sex: 'female', ageYears: 1, size: 'small', cityName: 'Брест', ownerType: 'organization', orgName: 'Кошкин дом', descriptionText: 'Ласковая кошка, приучена к лотку.', status: 'published' },
  { name: 'Безымянный', species: 'dog', sex: 'unknown', ageYears: 3, size: 'medium', cityName: 'Минск', ownerType: 'organization', orgName: 'Приют «Верный друг»', facilityName: 'ГУ «Фауна города» (Минск, Гурского 47)', intakeOffsetDays: 3, descriptionText: 'Попал в службу отлова, срочно ищет дом.', status: 'published' },
  { name: 'Барсик', species: 'cat', sex: 'male', ageYears: 4, size: 'medium', cityName: 'Гомель', ownerType: 'citizen', descriptionText: 'Спокойный кот для квартиры.', status: 'published' },
];
