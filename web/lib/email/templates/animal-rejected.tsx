import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function AnimalRejected({ title, reason }: { title: string; reason?: string | null }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Объявление отклонено</Heading>
          <Text>Ваше объявление «{title}» не прошло модерацию и было отклонено.</Text>
          {reason ? <Text>Причина: {reason}</Text> : null}
          <Text>Вы можете отредактировать объявление в личном кабинете и отправить его на проверку повторно.</Text>
        </Container>
      </Body>
    </Html>
  );
}
