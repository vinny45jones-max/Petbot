import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function MagicLink({ loginUrl }: { loginUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Войти на Pet Aggregator BY</Heading>
          <Text>Нажмите ссылку для входа без пароля. Ссылка действует 15 минут.</Text>
          <Link href={loginUrl}>Войти</Link>
        </Container>
      </Body>
    </Html>
  );
}
