import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function DonationReceipt({ amountText, targetText, donorName }: { amountText: string; targetText: string; donorName?: string | null }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Спасибо за помощь{donorName ? `, ${donorName}` : ''}!</Heading>
          <Text>Мы получили ваше пожертвование {amountText} {targetText}.</Text>
          <Text>Это реально спасает жизни животных. Спасибо, что вы рядом.</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Это автоматический чек о платеже. Если вы не совершали оплату — напишите нам.</Text>
        </Container>
      </Body>
    </Html>
  );
}
