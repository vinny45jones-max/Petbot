import * as migration_20261007_152835_baseline from './20261007_152835_baseline';
import * as migration_20261007_190524_comments_report_flags from './20261007_190524_comments_report_flags';
import * as migration_20261007_190812_cruelty_partner_apps from './20261007_190812_cruelty_partner_apps';
import * as migration_20261007_191026_blog_posts from './20261007_191026_blog_posts';
import * as migration_20261007_191311_legal_articles from './20261007_191311_legal_articles';
import * as migration_20261007_191549_help_glossary from './20261007_191549_help_glossary';
import * as migration_20261007_192222_animals_special_status from './20261007_192222_animals_special_status';
import * as migration_20261110_202716_urgency_announce from './20261110_202716_urgency_announce';
import * as migration_20261111_074019_donations from './20261111_074019_donations';
import * as migration_20261111_104430_donations_card_provider from './20261111_104430_donations_card_provider';

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
    name: '20261007_191026_blog_posts',
  },
  {
    up: migration_20261007_191311_legal_articles.up,
    down: migration_20261007_191311_legal_articles.down,
    name: '20261007_191311_legal_articles',
  },
  {
    up: migration_20261007_191549_help_glossary.up,
    down: migration_20261007_191549_help_glossary.down,
    name: '20261007_191549_help_glossary',
  },
  {
    up: migration_20261007_192222_animals_special_status.up,
    down: migration_20261007_192222_animals_special_status.down,
    name: '20261007_192222_animals_special_status',
  },
  {
    up: migration_20261110_202716_urgency_announce.up,
    down: migration_20261110_202716_urgency_announce.down,
    name: '20261110_202716_urgency_announce',
  },
  {
    up: migration_20261111_074019_donations.up,
    down: migration_20261111_074019_donations.down,
    name: '20261111_074019_donations',
  },
  {
    up: migration_20261111_104430_donations_card_provider.up,
    down: migration_20261111_104430_donations_card_provider.down,
    name: '20261111_104430_donations_card_provider'
  },
];
