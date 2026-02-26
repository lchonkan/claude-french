-- Seed data: A1 French vocabulary items
-- 60 items covering greetings, numbers, colors, days, common nouns, and common verbs

INSERT INTO vocabulary_items (french_text, spanish_translation, example_sentence_fr, example_sentence_es, difficulty_score, cefr_level, tags) VALUES

-- Greetings (6 items)
('bonjour', 'buenos dias / hola', 'Bonjour, comment allez-vous ?', 'Buenos dias, como esta usted?', 1, 'A1', ARRAY['greetings', 'daily']),
('bonsoir', 'buenas tardes / buenas noches', 'Bonsoir, je suis content de vous voir.', 'Buenas tardes, estoy contento de verle.', 1, 'A1', ARRAY['greetings', 'daily']),
('salut', 'hola (informal)', 'Salut, ca va ?', 'Hola, que tal?', 1, 'A1', ARRAY['greetings', 'informal']),
('au revoir', 'adios', 'Au revoir, a demain !', 'Adios, hasta manana!', 1, 'A1', ARRAY['greetings', 'daily']),
('merci', 'gracias', 'Merci beaucoup pour le cadeau.', 'Muchas gracias por el regalo.', 1, 'A1', ARRAY['greetings', 'politeness']),
('s''il vous plait', 'por favor', 'Un cafe, s''il vous plait.', 'Un cafe, por favor.', 2, 'A1', ARRAY['greetings', 'politeness']),

-- Numbers (10 items)
('un', 'uno', 'J''ai un chat a la maison.', 'Tengo un gato en casa.', 1, 'A1', ARRAY['numbers', 'basic']),
('deux', 'dos', 'Il y a deux livres sur la table.', 'Hay dos libros sobre la mesa.', 1, 'A1', ARRAY['numbers', 'basic']),
('trois', 'tres', 'Nous avons trois enfants.', 'Tenemos tres hijos.', 1, 'A1', ARRAY['numbers', 'basic']),
('quatre', 'cuatro', 'La maison a quatre chambres.', 'La casa tiene cuatro habitaciones.', 1, 'A1', ARRAY['numbers', 'basic']),
('cinq', 'cinco', 'Je travaille cinq jours par semaine.', 'Trabajo cinco dias por semana.', 1, 'A1', ARRAY['numbers', 'basic']),
('six', 'seis', 'Il est six heures du matin.', 'Son las seis de la manana.', 1, 'A1', ARRAY['numbers', 'basic']),
('sept', 'siete', 'Il y a sept jours dans une semaine.', 'Hay siete dias en una semana.', 1, 'A1', ARRAY['numbers', 'basic']),
('huit', 'ocho', 'Le cours commence a huit heures.', 'La clase empieza a las ocho.', 2, 'A1', ARRAY['numbers', 'basic']),
('neuf', 'nueve', 'J''ai neuf amis dans la classe.', 'Tengo nueve amigos en la clase.', 2, 'A1', ARRAY['numbers', 'basic']),
('dix', 'diez', 'Le magasin ferme a dix heures.', 'La tienda cierra a las diez.', 1, 'A1', ARRAY['numbers', 'basic']),

-- Colors (10 items)
('rouge', 'rojo', 'La voiture rouge est rapide.', 'El coche rojo es rapido.', 1, 'A1', ARRAY['colors', 'adjectives']),
('bleu', 'azul', 'Le ciel est bleu aujourd''hui.', 'El cielo esta azul hoy.', 1, 'A1', ARRAY['colors', 'adjectives']),
('vert', 'verde', 'Les arbres sont verts au printemps.', 'Los arboles son verdes en primavera.', 1, 'A1', ARRAY['colors', 'adjectives']),
('jaune', 'amarillo', 'Le soleil est jaune et brillant.', 'El sol es amarillo y brillante.', 1, 'A1', ARRAY['colors', 'adjectives']),
('noir', 'negro', 'Le chat noir dort sur le sofa.', 'El gato negro duerme en el sofa.', 1, 'A1', ARRAY['colors', 'adjectives']),
('blanc', 'blanco', 'La neige est blanche en hiver.', 'La nieve es blanca en invierno.', 1, 'A1', ARRAY['colors', 'adjectives']),
('rose', 'rosa', 'Elle porte une robe rose.', 'Ella lleva un vestido rosa.', 1, 'A1', ARRAY['colors', 'adjectives']),
('orange', 'naranja', 'J''aime le jus d''orange frais.', 'Me gusta el zumo de naranja fresco.', 2, 'A1', ARRAY['colors', 'adjectives']),
('gris', 'gris', 'Le temps est gris aujourd''hui.', 'El tiempo esta gris hoy.', 1, 'A1', ARRAY['colors', 'adjectives']),
('violet', 'violeta', 'Les fleurs violettes sont belles.', 'Las flores violetas son bonitas.', 2, 'A1', ARRAY['colors', 'adjectives']),

-- Days of the week (7 items)
('lundi', 'lunes', 'Lundi, je vais a l''ecole.', 'El lunes, voy a la escuela.', 1, 'A1', ARRAY['days', 'time']),
('mardi', 'martes', 'Mardi, j''ai un cours de francais.', 'El martes, tengo una clase de frances.', 1, 'A1', ARRAY['days', 'time']),
('mercredi', 'miercoles', 'Mercredi, les enfants n''ont pas ecole.', 'El miercoles, los ninos no tienen escuela.', 2, 'A1', ARRAY['days', 'time']),
('jeudi', 'jueves', 'Jeudi, nous allons au marche.', 'El jueves, vamos al mercado.', 1, 'A1', ARRAY['days', 'time']),
('vendredi', 'viernes', 'Vendredi soir, on sort avec des amis.', 'El viernes por la noche, salimos con amigos.', 2, 'A1', ARRAY['days', 'time']),
('samedi', 'sabado', 'Samedi, je fais du sport.', 'El sabado, hago deporte.', 1, 'A1', ARRAY['days', 'time']),
('dimanche', 'domingo', 'Dimanche, la famille se retrouve.', 'El domingo, la familia se reune.', 2, 'A1', ARRAY['days', 'time']),

-- Common nouns (19 items)
('la maison', 'la casa', 'La maison est grande et belle.', 'La casa es grande y bonita.', 1, 'A1', ARRAY['nouns', 'places']),
('l''ecole', 'la escuela', 'Les enfants vont a l''ecole le matin.', 'Los ninos van a la escuela por la manana.', 2, 'A1', ARRAY['nouns', 'places', 'education']),
('le livre', 'el libro', 'Je lis un livre interessant.', 'Leo un libro interesante.', 1, 'A1', ARRAY['nouns', 'objects', 'education']),
('le chat', 'el gato', 'Le chat dort sur le canape.', 'El gato duerme en el sofa.', 1, 'A1', ARRAY['nouns', 'animals']),
('le chien', 'el perro', 'Le chien joue dans le jardin.', 'El perro juega en el jardin.', 1, 'A1', ARRAY['nouns', 'animals']),
('l''eau', 'el agua', 'Je bois de l''eau tous les jours.', 'Bebo agua todos los dias.', 2, 'A1', ARRAY['nouns', 'food', 'daily']),
('le pain', 'el pan', 'Le pain frais est delicieux.', 'El pan fresco es delicioso.', 1, 'A1', ARRAY['nouns', 'food']),
('le fromage', 'el queso', 'La France est connue pour son fromage.', 'Francia es conocida por su queso.', 2, 'A1', ARRAY['nouns', 'food', 'culture']),
('le cafe', 'el cafe', 'Je prends un cafe chaque matin.', 'Tomo un cafe cada manana.', 1, 'A1', ARRAY['nouns', 'food', 'daily']),
('la famille', 'la familia', 'Ma famille habite a Paris.', 'Mi familia vive en Paris.', 1, 'A1', ARRAY['nouns', 'people', 'daily']),
('l''ami', 'el amigo', 'Mon ami s''appelle Pierre.', 'Mi amigo se llama Pierre.', 1, 'A1', ARRAY['nouns', 'people']),
('la rue', 'la calle', 'La rue est calme le dimanche.', 'La calle esta tranquila el domingo.', 1, 'A1', ARRAY['nouns', 'places']),
('la table', 'la mesa', 'Le diner est sur la table.', 'La cena esta en la mesa.', 1, 'A1', ARRAY['nouns', 'objects', 'daily']),
('la porte', 'la puerta', 'Ferme la porte, s''il te plait.', 'Cierra la puerta, por favor.', 1, 'A1', ARRAY['nouns', 'objects']),
('le travail', 'el trabajo', 'Je vais au travail en metro.', 'Voy al trabajo en metro.', 2, 'A1', ARRAY['nouns', 'daily', 'work']),
('la voiture', 'el coche', 'La voiture est garee devant la maison.', 'El coche esta aparcado delante de la casa.', 2, 'A1', ARRAY['nouns', 'transport']),
('le jardin', 'el jardin', 'Les fleurs poussent dans le jardin.', 'Las flores crecen en el jardin.', 1, 'A1', ARRAY['nouns', 'places', 'nature']),
('la fenetre', 'la ventana', 'Ouvre la fenetre, il fait chaud.', 'Abre la ventana, hace calor.', 2, 'A1', ARRAY['nouns', 'objects']),
('le magasin', 'la tienda', 'Le magasin ouvre a neuf heures.', 'La tienda abre a las nueve.', 2, 'A1', ARRAY['nouns', 'places', 'shopping']),

-- Common verbs (8 items)
('etre', 'ser / estar', 'Je suis etudiant a l''universite.', 'Soy estudiante en la universidad.', 2, 'A1', ARRAY['verbs', 'essential']),
('avoir', 'tener / haber', 'J''ai vingt ans.', 'Tengo veinte anos.', 2, 'A1', ARRAY['verbs', 'essential']),
('aller', 'ir', 'Je vais au supermarche.', 'Voy al supermercado.', 2, 'A1', ARRAY['verbs', 'movement']),
('faire', 'hacer', 'Qu''est-ce que tu fais ce soir ?', 'Que haces esta noche?', 3, 'A1', ARRAY['verbs', 'essential']),
('manger', 'comer', 'Nous mangeons a midi.', 'Comemos al mediodia.', 1, 'A1', ARRAY['verbs', 'food', 'daily']),
('boire', 'beber', 'Je bois du the le matin.', 'Bebo te por la manana.', 2, 'A1', ARRAY['verbs', 'food', 'daily']),
('parler', 'hablar', 'Elle parle francais et espagnol.', 'Ella habla frances y espanol.', 1, 'A1', ARRAY['verbs', 'communication']),
('ecouter', 'escuchar', 'J''ecoute de la musique francaise.', 'Escucho musica francesa.', 2, 'A1', ARRAY['verbs', 'communication']);
