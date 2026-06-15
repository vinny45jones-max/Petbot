import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function InquiryReceived({ animalTitle, applicantName, phone, telegram, message }: { animalTitle: string; applicantName?: string; phone?: string; telegram?: string; message: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Новая заявка на усыновление</Heading>
          <Text>Животное: {animalTitle}</Text>
          {applicantName ? <Text>От: {applicantName}</Text> : null}
          {phone ? <Text>Телефон: {phone}</Text> : null}
          {telegram ? <Text>Telegram: {telegram}</Text> : null}
          <Text>Сообщение: {message}</Text>
        </Container>
      </Body>
    </Html>
  );
}
