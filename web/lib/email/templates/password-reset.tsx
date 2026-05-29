import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function PasswordReset({ resetUrl }: { resetUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Сброс пароля</Heading>
          <Text>Нажмите чтобы установить новый пароль. Ссылка действует 1 час.</Text>
          <Link href={resetUrl}>Сбросить пароль</Link>
          <Text style={{ fontSize: '12px', color: '#666' }}>Если вы не запрашивали, проигнорируйте письмо.</Text>
        </Container>
      </Body>
    </Html>
  );
}
