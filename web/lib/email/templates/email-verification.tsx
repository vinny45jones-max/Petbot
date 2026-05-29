import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function EmailVerification({ verifyUrl }: { verifyUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Подтвердите email</Heading>
          <Text>Нажмите кнопку чтобы подтвердить email. Ссылка действует 24 часа.</Text>
          <Link href={verifyUrl}>Подтвердить</Link>
          <Text style={{ fontSize: '12px', color: '#666' }}>Если вы не регистрировались, проигнорируйте письмо.</Text>
        </Container>
      </Body>
    </Html>
  );
}
