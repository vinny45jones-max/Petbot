import { Html, Body, Container, Heading, Text, Link } from '@react-email/components';

export default function AnimalPublished({ title, animalUrl }: { title: string; animalUrl: string }) {
  return (
    <Html>
      <Body>
        <Container>
          <Heading>Объявление опубликовано</Heading>
          <Text>Ваше объявление «{title}» прошло проверку и опубликовано.</Text>
          <Link href={animalUrl}>Открыть объявление</Link>
        </Container>
      </Body>
    </Html>
  );
}
