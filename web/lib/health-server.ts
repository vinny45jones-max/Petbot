// Реальные проверки для /api/health и /status: лёгкий запрос в БД и HeadBucket бакета медиа в R2.
import { getPayload } from 'payload';
import config from '@payload-config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { buildR2StorageConfig, type R2Env } from '@/lib/storage/r2-adapter';
import { runHealthChecks, type HealthChecks } from '@/lib/health';

function storageProbe(): (() => Promise<void>) | null {
  if (!process.env.R2_BUCKET || !process.env.R2_ACCESS_KEY_ID) return null;
  return async () => {
    const { bucket, config: s3 } = buildR2StorageConfig(process.env as R2Env);
    await new S3Client(s3).send(new HeadBucketCommand({ Bucket: bucket }));
  };
}

export async function checkHealth(): Promise<HealthChecks> {
  return runHealthChecks({
    db: async () => {
      const payload = await getPayload({ config });
      await payload.find({ collection: 'cities', limit: 1, depth: 0 });
    },
    storage: storageProbe(),
  });
}
