import { sendEmail } from '@/lib/email/resend-client';
import { notifyAdminChannel } from '@/lib/notify/telegram';
import { newAnimalAdminMessage, newInquiryMessage } from '@/lib/notify/messages';
import AnimalPublished from '@/lib/email/templates/animal-published';
import AnimalRejected from '@/lib/email/templates/animal-rejected';
import InquiryReceived from '@/lib/email/templates/inquiry-received';
import InquiryConfirmation from '@/lib/email/templates/inquiry-confirmation';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/** Новое объявление на модерацию -> Telegram модераторам. */
export async function notifyNewAnimal(a: { id: string | number; petNumber: number; name?: string | null; species: string; city?: string }): Promise<void> {
  await notifyAdminChannel(newAnimalAdminMessage({
    petNumber: a.petNumber, name: a.name, species: a.species, city: a.city,
    adminUrl: `${BASE}/admin/collections/animals/${a.id}`,
  }));
}

/** Объявление опубликовано -> email владельцу. */
export async function notifyAnimalPublished(ownerEmail: string | null | undefined, title: string, animalUrl: string): Promise<void> {
  if (!ownerEmail) return;
  await sendEmail({ to: ownerEmail, subject: `Объявление «${title}» опубликовано`, react: AnimalPublished({ title, animalUrl }) });
}

/** Объявление отклонено модератором -> email владельцу (§16.7). */
export async function notifyAnimalRejected(ownerEmail: string | null | undefined, title: string, reason?: string | null): Promise<void> {
  if (!ownerEmail) return;
  await sendEmail({ to: ownerEmail, subject: `Объявление «${title}» отклонено`, react: AnimalRejected({ title, reason }) });
}

/** Новая заявка adoption -> email владельцу/орг + Telegram + подтверждение заявителю. */
export async function notifyNewInquiry(params: {
  ownerEmail?: string | null;
  applicantEmail?: string | null;
  animalTitle: string;
  applicantName?: string;
  phone?: string;
  telegram?: string;
  message: string;
}): Promise<void> {
  if (params.ownerEmail) {
    await sendEmail({
      to: params.ownerEmail,
      subject: `Заявка на усыновление: ${params.animalTitle}`,
      react: InquiryReceived({ animalTitle: params.animalTitle, applicantName: params.applicantName, phone: params.phone, telegram: params.telegram, message: params.message }),
    });
  }
  await notifyAdminChannel(newInquiryMessage({ animalTitle: params.animalTitle, applicantName: params.applicantName, phone: params.phone, telegram: params.telegram }));
  if (params.applicantEmail) {
    await sendEmail({ to: params.applicantEmail, subject: 'Заявка отправлена', react: InquiryConfirmation({ animalTitle: params.animalTitle }) });
  }
}
