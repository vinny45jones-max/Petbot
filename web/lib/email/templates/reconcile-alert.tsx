import { Html, Body, Container, Heading, Text } from '@react-email/components';

export default function ReconcileAlert({ fixed, failed, stillPending }: { fixed: number; failed: number; stillPending: number }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Сверка пожертвований</Heading>
          <Text>Подтверждено оплат (не дошло уведомление): {fixed}</Text>
          <Text>Не прошли или возвращены: {failed}</Text>
          <Text>Всё ещё ждут оплаты: {stillPending}</Text>
        </Container>
      </Body>
    </Html>
  );
}
