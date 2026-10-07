import * as migration_20261007_152835_baseline from './20261007_152835_baseline';
import * as migration_20261007_190524_comments_report_flags from './20261007_190524_comments_report_flags';

export const migrations = [
  {
    up: migration_20261007_152835_baseline.up,
    down: migration_20261007_152835_baseline.down,
    name: '20261007_152835_baseline',
  },
  {
    up: migration_20261007_190524_comments_report_flags.up,
    down: migration_20261007_190524_comments_report_flags.down,
    name: '20261007_190524_comments_report_flags'
  },
];
