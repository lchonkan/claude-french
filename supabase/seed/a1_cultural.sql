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
  'Les Francais aiment aller au cafe pour boire un cafe, un the ou un jus d''orange. '
  'On peut aussi manger un croissant ou un sandwich.\n\n'
  'Au cafe, on dit "Bonjour" quand on arrive. On dit "Un cafe, s''il vous plait" pour commander. '
  'Les cafes parisiens ont souvent des terrasses. Les gens aiment s''asseoir dehors et regarder les passants.\n\n'
  'Un cafe coute environ 2 euros. Un cafe creme coute un peu plus. '
  'Les cafes sont ouverts du matin au soir. C''est un lieu de rencontre pour les amis et la famille.',
  E'Los cafes son muy importantes en Francia. En Paris, hay cafes por todas partes. '
  'A los franceses les gusta ir al cafe para beber un cafe, un te o un jugo de naranja. '
  'Tambien se puede comer un croissant o un sandwich.\n\n'
  'En el cafe, se dice "Bonjour" (buenos dias) al llegar. Se dice "Un cafe, s''il vous plait" '
  '(un cafe, por favor) para pedir. Los cafes parisinos suelen tener terrazas. '
  'A la gente le gusta sentarse afuera y observar a los transeuntes.\n\n'
  'Un cafe cuesta alrededor de 2 euros. Un cafe con leche cuesta un poco mas. '
  'Los cafes estan abiertos desde la manana hasta la noche. '
  'Es un lugar de encuentro para amigos y familia.',
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
  'Quand on voit un ami, on dit "Salut".\n\n'
  'Le matin, on dit "Bonjour". Le soir, on dit "Bonsoir". '
  'Pour dire au revoir, on dit "Au revoir" ou "A bientot".\n\n'
  'En France, on fait souvent la bise. La bise, c''est un bisou sur la joue. '
  'Entre amis, on fait la bise. Au travail, on serre la main.\n\n'
  'Il est impoli de ne pas dire "Bonjour". '
  'Les Francais disent toujours "Merci" et "S''il vous plait". La politesse est tres importante.',
  E'En Francia, decir "Bonjour" (buenos dias) es muy importante. '
  'Cuando entras en una tienda, dices "Bonjour". Cuando ves a un amigo, dices "Salut" (hola).\n\n'
  'Por la manana, se dice "Bonjour". Por la noche, se dice "Bonsoir" (buenas noches). '
  'Para despedirse, se dice "Au revoir" (adios) o "A bientot" (hasta pronto).\n\n'
  'En Francia, es comun hacer "la bise" (un beso en la mejilla). '
  'Entre amigos, se hace la bise. En el trabajo, se da la mano.\n\n'
  'Es descortes no decir "Bonjour". Los franceses siempre dicen "Merci" (gracias) '
  'y "S''il vous plait" (por favor). La cortesia es muy importante.',
  ARRAY[
    'a0a0a0a0-94ee-4000-a000-000000000001'::UUID,
    'a0a0a0a0-94ee-4000-a000-000000000002'::UUID,
    'a0a0a0a0-94ee-4000-a000-000000000003'::UUID
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
  'Il y a 16 lignes de metro. Chaque ligne a une couleur et un numero.\n\n'
  'Pour prendre le metro, il faut acheter un ticket. Un ticket coute environ 2 euros. '
  'On peut aussi acheter un carnet de 10 tickets.\n\n'
  'Dans le metro, on entend "Attention a la fermeture des portes". '
  'Les stations sont bien indiquees. On peut changer de ligne dans les grandes stations.\n\n'
  'Le metro est ouvert de 5h30 a 1h00 du matin. Le vendredi et samedi soir, '
  'il est ouvert jusqu''a 2h00. Le metro est le moyen le plus rapide pour se deplacer a Paris.',
  E'El metro de Paris es un medio de transporte muy practico. '
  'Hay 16 lineas de metro. Cada linea tiene un color y un numero.\n\n'
  'Para tomar el metro, hay que comprar un boleto. Un boleto cuesta alrededor de 2 euros. '
  'Tambien se puede comprar un taco de 10 boletos.\n\n'
  'En el metro, se escucha "Atencion al cierre de las puertas". '
  'Las estaciones estan bien senalizadas. Se puede cambiar de linea en las estaciones grandes.\n\n'
  'El metro esta abierto de 5:30 a 1:00 de la manana. Los viernes y sabados por la noche, '
  'esta abierto hasta las 2:00. El metro es el medio mas rapido para desplazarse en Paris.',
  ARRAY[
    'a0a0a0a0-0e74-4000-a000-000000000001'::UUID,
    'a0a0a0a0-0e74-4000-a000-000000000002'::UUID,
    'a0a0a0a0-0e74-4000-a000-000000000003'::UUID
  ],
  'daily_life',
  false,
  true
);
