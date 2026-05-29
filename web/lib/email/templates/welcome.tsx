import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function WelcomeEmail({ firstName, appUrl }: { firstName?: string; appUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Добро пожаловать в Pet Aggregator BY{firstName ? `, ${firstName}` : ''}!</Heading>
          <Text>Спасибо что присоединились. На нашем сайте вы можете:</Text>
          <ul>
            <li>Найти питомца для усыновления</li>
            <li>Разместить объявление о пристройстве</li>
            <li>Помочь приюту донатом</li>
            <li>Сообщить о жестоком обращении</li>
          </ul>
          <Link href={appUrl}>Перейти на сайт</Link>
        </Container>
      </Body>
    </Html>
  );
}
