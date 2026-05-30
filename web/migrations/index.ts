import * as migration_20260530_065615_pet_number_sequence from './20260530_065615_pet_number_sequence';

export const migrations = [
  {
    up: migration_20260530_065615_pet_number_sequence.up,
    down: migration_20260530_065615_pet_number_sequence.down,
    name: '20260530_065615_pet_number_sequence'
  },
];
