// Реальные проверки для /api/health и /status: лёгкий запрос в БД и HeadBucket бакета медиа в R2.
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { buildR2StorageConfig, type R2Env } from '@/lib/storage/r2-adapter';
import { memoizeFor, runHealthChecks, type HealthChecks } from '@/lib/health';

let s3: { client: S3Client; bucket: string } | null = null;

function storageProbe(): (() => Promise<void>) | null {
  if (!process.env.R2_BUCKET || !process.env.R2_ACCESS_KEY_ID) return null;
  return async () => {
    if (!s3) {
      const r2 = buildR2StorageConfig(process.env as R2Env);
      s3 = { client: new S3Client(r2.config), bucket: r2.bucket };
    }
    await s3.client.send(new HeadBucketCommand({ Bucket: s3.bucket }));
  };
}

// UptimeRobot ходит раз в 5 минут — 30 с кэша не скрывают аварию, но и не дают спамом нагрузить БД и R2.
export const checkHealth: () => Promise<HealthChecks> = memoizeFor(() => runHealthChecks({
    db: async () => {
      const payload = await getPayload({ config });
      await payload.find({ collection: 'cities', limit: 1, depth: 0 });
    },
    storage: storageProbe(),
  }), 30_000);
