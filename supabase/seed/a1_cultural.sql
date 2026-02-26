-- Seed data: A1 cultural notes
-- 3 articles covering cafe culture, greetings, and the Paris metro

INSERT INTO cultural_notes (
  id, cefr_level, title_fr, title_es, content_fr, content_es,
  vocabulary_ids, category, is_generated, reviewed
) VALUES

-- 1. Les cafes parisiens
(
  'a0a0a0a0-0001-4000-a000-000000000001',
  'A1',
  'Les cafes parisiens',
  'Los cafes parisinos',
  E'Les cafes sont tres importants en France. A Paris, il y a des cafes partout. '
  E'Les Francais aiment aller au cafe pour boire un cafe, un the ou un jus d''orange. '
  E'On peut aussi manger un croissant ou un sandwich.\n\n'
  E'Au cafe, on dit "Bonjour" quand on arrive. On dit "Un cafe, s''il vous plait" pour commander. '
  E'Les cafes parisiens ont souvent des terrasses. Les gens aiment s''asseoir dehors et regarder les passants.\n\n'
  E'Un cafe coute environ 2 euros. Un cafe creme coute un peu plus. '
  E'Les cafes sont ouverts du matin au soir. C''est un lieu de rencontre pour les amis et la famille.',
  E'Los cafes son muy importantes en Francia. En Paris, hay cafes por todas partes. '
  E'A los franceses les gusta ir al cafe para beber un cafe, un te o un jugo de naranja. '
  E'Tambien se puede comer un croissant o un sandwich.\n\n'
  E'En el cafe, se dice "Bonjour" (buenos dias) al llegar. Se dice "Un cafe, s''il vous plait" '
  E'(un cafe, por favor) para pedir. Los cafes parisinos suelen tener terrazas. '
  E'A la gente le gusta sentarse afuera y observar a los transeuntes.\n\n'
  E'Un cafe cuesta alrededor de 2 euros. Un cafe con leche cuesta un poco mas. '
  E'Los cafes estan abiertos desde la manana hasta la noche. '
  E'Es un lugar de encuentro para amigos y familia.',
  ARRAY[
    'a0a0a0a0-cafe-4000-a000-000000000001'::UUID,
    'a0a0a0a0-cafe-4000-a000-000000000002'::UUID,
    'a0a0a0a0-cafe-4000-a000-000000000003'::UUID
  ],
  'cuisine',
  false,
  true
),

-- 2. Bonjour et les salutations
(
  'a0a0a0a0-0001-4000-a000-000000000002',
  'A1',
  'Bonjour et les salutations',
  'Bonjour y los saludos franceses',
  E'En France, dire "Bonjour" est tres important. Quand on entre dans un magasin, on dit "Bonjour". '
  E'Quand on voit un ami, on dit "Salut".\n\n'
  E'Le matin, on dit "Bonjour". Le soir, on dit "Bonsoir". '
  E'Pour dire au revoir, on dit "Au revoir" ou "A bientot".\n\n'
  E'En France, on fait souvent la bise. La bise, c''est un bisou sur la joue. '
  E'Entre amis, on fait la bise. Au travail, on serre la main.\n\n'
  E'Il est impoli de ne pas dire "Bonjour". '
  E'Les Francais disent toujours "Merci" et "S''il vous plait". La politesse est tres importante.',
  E'En Francia, decir "Bonjour" (buenos dias) es muy importante. '
  E'Cuando entras en una tienda, dices "Bonjour". Cuando ves a un amigo, dices "Salut" (hola).\n\n'
  E'Por la manana, se dice "Bonjour". Por la noche, se dice "Bonsoir" (buenas noches). '
  E'Para despedirse, se dice "Au revoir" (adios) o "A bientot" (hasta pronto).\n\n'
  E'En Francia, es comun hacer "la bise" (un beso en la mejilla). '
  E'Entre amigos, se hace la bise. En el trabajo, se da la mano.\n\n'
  E'Es descortes no decir "Bonjour". Los franceses siempre dicen "Merci" (gracias) '
  E'y "S''il vous plait" (por favor). La cortesia es muy importante.',
  ARRAY[
    'a0a0a0a0-greet-4000-a000-000000000001'::UUID,
    'a0a0a0a0-greet-4000-a000-000000000002'::UUID,
    'a0a0a0a0-greet-4000-a000-000000000003'::UUID
  ],
  'etiquette',
  false,
  true
),

-- 3. Le metro de Paris
(
  'a0a0a0a0-0001-4000-a000-000000000003',
  'A1',
  'Le metro de Paris',
  'El metro de Paris',
  E'Le metro de Paris est un moyen de transport tres pratique. '
  E'Il y a 16 lignes de metro. Chaque ligne a une couleur et un numero.\n\n'
  E'Pour prendre le metro, il faut acheter un ticket. Un ticket coute environ 2 euros. '
  E'On peut aussi acheter un carnet de 10 tickets.\n\n'
  E'Dans le metro, on entend "Attention a la fermeture des portes". '
  E'Les stations sont bien indiquees. On peut changer de ligne dans les grandes stations.\n\n'
  E'Le metro est ouvert de 5h30 a 1h00 du matin. Le vendredi et samedi soir, '
  E'il est ouvert jusqu''a 2h00. Le metro est le moyen le plus rapide pour se deplacer a Paris.',
  E'El metro de Paris es un medio de transporte muy practico. '
  E'Hay 16 lineas de metro. Cada linea tiene un color y un numero.\n\n'
  E'Para tomar el metro, hay que comprar un boleto. Un boleto cuesta alrededor de 2 euros. '
  E'Tambien se puede comprar un taco de 10 boletos.\n\n'
  E'En el metro, se escucha "Atencion al cierre de las puertas". '
  E'Las estaciones estan bien senalizadas. Se puede cambiar de linea en las estaciones grandes.\n\n'
  E'El metro esta abierto de 5:30 a 1:00 de la manana. Los viernes y sabados por la noche, '
  E'esta abierto hasta las 2:00. El metro es el medio mas rapido para desplazarse en Paris.',
  ARRAY[
    'a0a0a0a0-metr-4000-a000-000000000001'::UUID,
    'a0a0a0a0-metr-4000-a000-000000000002'::UUID,
    'a0a0a0a0-metr-4000-a000-000000000003'::UUID
  ],
  'daily_life',
  false,
  true
);
