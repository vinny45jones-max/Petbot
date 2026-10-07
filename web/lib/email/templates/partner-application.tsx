import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function PartnerApplicationEmail({ name, unp, contact, links, message, adminUrl }: { name: string; unp?: string; contact: string; links?: string; message?: string; adminUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Новая заявка на подключение приюта</Heading>
          <Text>Организация: {name}</Text>
          {unp ? <Text>УНП: {unp}</Text> : null}
          <Text>Контакт: {contact}</Text>
          {links ? <Text>Ссылки: {links}</Text> : null}
          {message ? <Text>Сообщение: {message}</Text> : null}
          <Link href={adminUrl}>Открыть в админке</Link>
        </Container>
      </Body>
    </Html>
  );
}
