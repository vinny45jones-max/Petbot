import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export interface UrgentAlertProps {
  city: string;
  items: { title: string; url: string; daysLeft: number | null }[];
  profileUrl: string;
}

export default function UrgentAlert({ city, items, profileUrl }: UrgentAlertProps) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Срочные животные рядом ({city})</Heading>
          <Text>Этим животным грозит усыпление по срокам содержания. Если можете забрать или поделиться — это спасёт жизнь.</Text>
          {items.map((i) => (
            <Text key={i.url}>
              <Link href={i.url}>{i.title}</Link> — {i.daysLeft != null && i.daysLeft > 0 ? `осталось ${i.daysLeft} дн.` : 'истекает срок содержания'}
            </Text>
          ))}
          <Text style={{ color: '#666', fontSize: 12 }}>
            Вы получили это письмо, потому что подписались на срочные уведомления по городу. <Link href={profileUrl}>Отписаться можно в профиле</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
