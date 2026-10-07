import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function CrueltyReceived({ description, contact, adminUrl }: { description: string; contact?: string; adminUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Новое сообщение о жестоком обращении</Heading>
          <Text>Описание: {description}</Text>
          {contact ? <Text>Контакт: {contact}</Text> : null}
          <Link href={adminUrl}>Открыть в админке</Link>
        </Container>
      </Body>
    </Html>
  );
}
