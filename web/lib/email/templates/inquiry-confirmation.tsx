import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function InquiryConfirmation({ animalTitle }: { animalTitle: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Заявка отправлена</Heading>
          <Text>Ваша заявка на усыновление «{animalTitle}» отправлена. Владелец свяжется с вами по указанным контактам.</Text>
        </Container>
      </Body>
    </Html>
  );
}
