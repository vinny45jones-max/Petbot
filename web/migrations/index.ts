import * as migration_20261007_152835_baseline from './20261007_152835_baseline';
import * as migration_20261007_190524_comments_report_flags from './20261007_190524_comments_report_flags';
import * as migration_20261007_190812_cruelty_partner_apps from './20261007_190812_cruelty_partner_apps';
import * as migration_20261007_191026_blog_posts from './20261007_191026_blog_posts';

export const migrations = [
  {
    up: migration_20261007_152835_baseline.up,
    down: migration_20261007_152835_baseline.down,
    name: '20261007_152835_baseline',
  },
  {
    up: migration_20261007_190524_comments_report_flags.up,
    down: migration_20261007_190524_comments_report_flags.down,
    name: '20261007_190524_comments_report_flags',
  },
  {
    up: migration_20261007_190812_cruelty_partner_apps.up,
    down: migration_20261007_190812_cruelty_partner_apps.down,
    name: '20261007_190812_cruelty_partner_apps',
  },
  {
    up: migration_20261007_191026_blog_posts.up,
    down: migration_20261007_191026_blog_posts.down,
    name: '20261007_191026_blog_posts'
  },
];
