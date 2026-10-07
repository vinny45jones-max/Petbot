import * as migration_20261007_152835_baseline from './20261007_152835_baseline';

export const migrations = [
  {
    up: migration_20261007_152835_baseline.up,
    down: migration_20261007_152835_baseline.down,
    name: '20261007_152835_baseline'
  },
];
