-- Seed data: A1 French listening comprehension exercises
-- 5 exercises covering everyday situations in Paris
-- Each exercise has 3-4 multiple_choice comprehension questions

-- ============================================================================
-- Exercise 1: Au cafe parisien (Ordering at a Parisian cafe)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-1157-0001-0001-000000000001',
  'listening',
  'A1',
  'En el cafe parisino',
  'Au cafe parisien',
  'Escucha un dialogo en un cafe parisino y responde preguntas sobre lo que piden los clientes.',
  '{
    "dialogue_text_fr": "Serveur : Bonjour ! Bienvenue au Cafe de Flore. Qu''est-ce que vous desirez ?\nClient : Bonjour ! Je voudrais un cafe creme, s''il vous plait.\nServeur : Tres bien. Et avec ceci ?\nClient : Un croissant aussi, s''il vous plait.\nServeur : D''accord. Autre chose ?\nClient : Non, merci. C''est combien ?\nServeur : Le cafe creme, c''est trois euros cinquante, et le croissant, deux euros. Ca fait cinq euros cinquante.\nClient : Voila. Merci beaucoup !\nServeur : Merci a vous. Bonne journee !",
    "dialogue_text_es": "Camarero: Buenos dias! Bienvenido al Cafe de Flore. Que desea?\nCliente: Buenos dias! Quisiera un cafe con leche, por favor.\nCamarero: Muy bien. Y con esto?\nCliente: Un croissant tambien, por favor.\nCamarero: De acuerdo. Algo mas?\nCliente: No, gracias. Cuanto es?\nCamarero: El cafe con leche cuesta tres euros con cincuenta, y el croissant, dos euros. Son cinco euros con cincuenta.\nCliente: Aqui tiene. Muchas gracias!\nCamarero: Gracias a usted. Buen dia!",
    "audio_url": "/audio/listening/a1/cafe-parisien.mp3",
    "duration_seconds": 45,
    "segments": [
      {"id": "s1", "start": 0.0, "end": 5.2, "text_fr": "Bonjour ! Bienvenue au Cafe de Flore. Qu''est-ce que vous desirez ?", "speaker": "serveur"},
      {"id": "s2", "start": 5.2, "end": 9.8, "text_fr": "Bonjour ! Je voudrais un cafe creme, s''il vous plait.", "speaker": "client"},
      {"id": "s3", "start": 9.8, "end": 12.0, "text_fr": "Tres bien. Et avec ceci ?", "speaker": "serveur"},
      {"id": "s4", "start": 12.0, "end": 16.5, "text_fr": "Un croissant aussi, s''il vous plait.", "speaker": "client"},
      {"id": "s5", "start": 16.5, "end": 19.0, "text_fr": "D''accord. Autre chose ?", "speaker": "serveur"},
      {"id": "s6", "start": 19.0, "end": 22.5, "text_fr": "Non, merci. C''est combien ?", "speaker": "client"},
      {"id": "s7", "start": 22.5, "end": 33.0, "text_fr": "Le cafe creme, c''est trois euros cinquante, et le croissant, deux euros. Ca fait cinq euros cinquante.", "speaker": "serveur"},
      {"id": "s8", "start": 33.0, "end": 38.0, "text_fr": "Voila. Merci beaucoup !", "speaker": "client"},
      {"id": "s9", "start": 38.0, "end": 45.0, "text_fr": "Merci a vous. Bonne journee !", "speaker": "serveur"}
    ]
  }',
  1
);

-- Comprehension questions for Exercise 1
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-1e34-0001-0001-000000000001',
  'a1000001-1157-0001-0001-000000000001',
  'multiple_choice',
  'Que pide el cliente para beber?',
  '{
    "question_fr": "Que commande le client comme boisson ?",
    "question_es": "Que pide el cliente para beber?",
    "options": ["Un the", "Un cafe creme", "Un jus d''orange", "Un chocolat chaud"],
    "correct_answer": "Un cafe creme",
    "explanation_es": "El cliente dice: \"Je voudrais un cafe creme, s''il vous plait.\" Un cafe creme es un cafe con leche."
  }',
  1, 1
),
(
  'a1000001-1e34-0001-0002-000000000002',
  'a1000001-1157-0001-0001-000000000001',
  'multiple_choice',
  'Que pide el cliente para comer?',
  '{
    "question_fr": "Que commande le client a manger ?",
    "question_es": "Que pide el cliente para comer?",
    "options": ["Une baguette", "Un sandwich", "Un croissant", "Une crepe"],
    "correct_answer": "Un croissant",
    "explanation_es": "El cliente dice: \"Un croissant aussi, s''il vous plait.\" Pide un croissant ademas de su cafe."
  }',
  1, 2
),
(
  'a1000001-1e34-0001-0003-000000000003',
  'a1000001-1157-0001-0001-000000000001',
  'multiple_choice',
  'Cuanto cuesta el total?',
  '{
    "question_fr": "Combien coute le total ?",
    "question_es": "Cuanto cuesta el total?",
    "options": ["3,50 euros", "2,00 euros", "5,50 euros", "6,00 euros"],
    "correct_answer": "5,50 euros",
    "explanation_es": "El camarero dice: \"Ca fait cinq euros cinquante.\" El cafe creme cuesta 3,50 EUR y el croissant 2,00 EUR, en total 5,50 EUR."
  }',
  1, 3
),
(
  'a1000001-1e34-0001-0004-000000000004',
  'a1000001-1157-0001-0001-000000000001',
  'multiple_choice',
  'Como se llama el cafe?',
  '{
    "question_fr": "Comment s''appelle le cafe ?",
    "question_es": "Como se llama el cafe?",
    "options": ["Cafe de Paris", "Cafe de Flore", "Cafe des Amis", "Cafe de la Paix"],
    "correct_answer": "Cafe de Flore",
    "explanation_es": "El camarero dice: \"Bienvenue au Cafe de Flore.\" Es un cafe real muy famoso en Paris, en el barrio de Saint-Germain-des-Pres."
  }',
  1, 4
);

-- ============================================================================
-- Exercise 2: Dans le metro (Metro announcements and directions)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-1157-0002-0001-000000000002',
  'listening',
  'A1',
  'En el metro',
  'Dans le metro',
  'Escucha anuncios del metro de Paris y una conversacion sobre direcciones.',
  '{
    "dialogue_text_fr": "Annonce : Attention, le prochain train arrive dans deux minutes. Direction : Chateau de Vincennes.\nPassager : Excusez-moi, pour aller a la Tour Eiffel, c''est quelle ligne ?\nParisien : La Tour Eiffel ? Vous prenez la ligne six, direction Charles de Gaulle - Etoile. Vous descendez a Bir-Hakeim.\nPassager : La ligne six. D''accord. C''est loin d''ici ?\nParisien : Non, c''est a cinq stations. Environ dix minutes.\nPassager : Merci beaucoup, monsieur !\nParisien : De rien. Bon voyage !\nAnnonce : Le train entre en gare. Attention a la fermeture des portes.",
    "dialogue_text_es": "Anuncio: Atencion, el proximo tren llega en dos minutos. Direccion: Chateau de Vincennes.\nPasajero: Disculpe, para ir a la Torre Eiffel, que linea es?\nParisino: La Torre Eiffel? Toma la linea seis, direccion Charles de Gaulle - Etoile. Se baja en Bir-Hakeim.\nPasajero: La linea seis. De acuerdo. Esta lejos de aqui?\nParisino: No, son cinco estaciones. Aproximadamente diez minutos.\nPasajero: Muchas gracias, senor!\nParisino: De nada. Buen viaje!\nAnuncio: El tren entra en la estacion. Atencion al cierre de puertas.",
    "audio_url": "/audio/listening/a1/dans-le-metro.mp3",
    "duration_seconds": 50,
    "segments": [
      {"id": "s1", "start": 0.0, "end": 7.5, "text_fr": "Attention, le prochain train arrive dans deux minutes. Direction : Chateau de Vincennes.", "speaker": "annonce"},
      {"id": "s2", "start": 7.5, "end": 13.0, "text_fr": "Excusez-moi, pour aller a la Tour Eiffel, c''est quelle ligne ?", "speaker": "passager"},
      {"id": "s3", "start": 13.0, "end": 22.0, "text_fr": "La Tour Eiffel ? Vous prenez la ligne six, direction Charles de Gaulle - Etoile. Vous descendez a Bir-Hakeim.", "speaker": "parisien"},
      {"id": "s4", "start": 22.0, "end": 27.5, "text_fr": "La ligne six. D''accord. C''est loin d''ici ?", "speaker": "passager"},
      {"id": "s5", "start": 27.5, "end": 33.0, "text_fr": "Non, c''est a cinq stations. Environ dix minutes.", "speaker": "parisien"},
      {"id": "s6", "start": 33.0, "end": 37.5, "text_fr": "Merci beaucoup, monsieur !", "speaker": "passager"},
      {"id": "s7", "start": 37.5, "end": 40.0, "text_fr": "De rien. Bon voyage !", "speaker": "parisien"},
      {"id": "s8", "start": 40.0, "end": 50.0, "text_fr": "Le train entre en gare. Attention a la fermeture des portes.", "speaker": "annonce"}
    ]
  }',
  2
);

-- Comprehension questions for Exercise 2
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-1e34-0002-0001-000000000001',
  'a1000001-1157-0002-0001-000000000002',
  'multiple_choice',
  'A donde quiere ir el pasajero?',
  '{
    "question_fr": "Ou veut aller le passager ?",
    "question_es": "A donde quiere ir el pasajero?",
    "options": ["Au Louvre", "A la Tour Eiffel", "A Notre-Dame", "Aux Champs-Elysees"],
    "correct_answer": "A la Tour Eiffel",
    "explanation_es": "El pasajero pregunta: \"Pour aller a la Tour Eiffel, c''est quelle ligne ?\" Quiere ir a la Torre Eiffel."
  }',
  1, 1
),
(
  'a1000001-1e34-0002-0002-000000000002',
  'a1000001-1157-0002-0001-000000000002',
  'multiple_choice',
  'Que linea de metro debe tomar?',
  '{
    "question_fr": "Quelle ligne de metro doit-il prendre ?",
    "question_es": "Que linea de metro debe tomar?",
    "options": ["La ligne 1", "La ligne 4", "La ligne 6", "La ligne 14"],
    "correct_answer": "La ligne 6",
    "explanation_es": "El parisino dice: \"Vous prenez la ligne six.\" La linea 6 del metro de Paris pasa por Bir-Hakeim, cerca de la Torre Eiffel."
  }',
  1, 2
),
(
  'a1000001-1e34-0002-0003-000000000003',
  'a1000001-1157-0002-0001-000000000002',
  'multiple_choice',
  'Cuantas estaciones son hasta el destino?',
  '{
    "question_fr": "Combien de stations faut-il pour arriver ?",
    "question_es": "Cuantas estaciones son hasta el destino?",
    "options": ["Trois stations", "Cinq stations", "Sept stations", "Dix stations"],
    "correct_answer": "Cinq stations",
    "explanation_es": "El parisino dice: \"C''est a cinq stations. Environ dix minutes.\" Son cinco estaciones y unos diez minutos de viaje."
  }',
  1, 3
);

-- ============================================================================
-- Exercise 3: Au marche (Shopping at a Paris market)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-1157-0003-0001-000000000003',
  'listening',
  'A1',
  'En el mercado',
  'Au marche',
  'Escucha una conversacion de compras en un mercado parisino y practica vocabulario de alimentos y precios.',
  '{
    "dialogue_text_fr": "Vendeur : Bonjour, madame ! Regardez mes belles pommes ! Deux euros le kilo !\nCliente : Bonjour ! Je voudrais un kilo de pommes, s''il vous plait.\nVendeur : Voila, un kilo de pommes. Elles sont delicieuses ! Autre chose ?\nCliente : Oui, je voudrais aussi des tomates. Elles sont a combien ?\nVendeur : Les tomates, c''est trois euros le kilo.\nCliente : D''accord, un demi-kilo de tomates, s''il vous plait.\nVendeur : Tres bien. Un kilo de pommes et un demi-kilo de tomates. Ca fait trois euros cinquante au total.\nCliente : Voici cinq euros.\nVendeur : Et voila votre monnaie, un euro cinquante. Merci, bonne journee !\nCliente : Au revoir, bonne journee !",
    "dialogue_text_es": "Vendedor: Buenos dias, senora! Mire mis hermosas manzanas! Dos euros el kilo!\nClienta: Buenos dias! Quisiera un kilo de manzanas, por favor.\nVendedor: Aqui tiene, un kilo de manzanas. Estan deliciosas! Algo mas?\nClienta: Si, tambien quisiera tomates. A cuanto estan?\nVendedor: Los tomates estan a tres euros el kilo.\nClienta: De acuerdo, medio kilo de tomates, por favor.\nVendedor: Muy bien. Un kilo de manzanas y medio kilo de tomates. Son tres euros con cincuenta en total.\nClienta: Aqui tiene cinco euros.\nVendedor: Y aqui tiene su cambio, un euro con cincuenta. Gracias, buen dia!\nClienta: Hasta luego, buen dia!",
    "audio_url": "/audio/listening/a1/au-marche.mp3",
    "duration_seconds": 55,
    "segments": [
      {"id": "s1", "start": 0.0, "end": 6.0, "text_fr": "Bonjour, madame ! Regardez mes belles pommes ! Deux euros le kilo !", "speaker": "vendeur"},
      {"id": "s2", "start": 6.0, "end": 11.5, "text_fr": "Bonjour ! Je voudrais un kilo de pommes, s''il vous plait.", "speaker": "cliente"},
      {"id": "s3", "start": 11.5, "end": 18.0, "text_fr": "Voila, un kilo de pommes. Elles sont delicieuses ! Autre chose ?", "speaker": "vendeur"},
      {"id": "s4", "start": 18.0, "end": 24.5, "text_fr": "Oui, je voudrais aussi des tomates. Elles sont a combien ?", "speaker": "cliente"},
      {"id": "s5", "start": 24.5, "end": 29.0, "text_fr": "Les tomates, c''est trois euros le kilo.", "speaker": "vendeur"},
      {"id": "s6", "start": 29.0, "end": 34.5, "text_fr": "D''accord, un demi-kilo de tomates, s''il vous plait.", "speaker": "cliente"},
      {"id": "s7", "start": 34.5, "end": 43.0, "text_fr": "Tres bien. Un kilo de pommes et un demi-kilo de tomates. Ca fait trois euros cinquante au total.", "speaker": "vendeur"},
      {"id": "s8", "start": 43.0, "end": 46.0, "text_fr": "Voici cinq euros.", "speaker": "cliente"},
      {"id": "s9", "start": 46.0, "end": 52.0, "text_fr": "Et voila votre monnaie, un euro cinquante. Merci, bonne journee !", "speaker": "vendeur"},
      {"id": "s10", "start": 52.0, "end": 55.0, "text_fr": "Au revoir, bonne journee !", "speaker": "cliente"}
    ]
  }',
  3
);

-- Comprehension questions for Exercise 3
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-1e34-0003-0001-000000000001',
  'a1000001-1157-0003-0001-000000000003',
  'multiple_choice',
  'Cuanto cuestan las manzanas por kilo?',
  '{
    "question_fr": "Combien coutent les pommes au kilo ?",
    "question_es": "Cuanto cuestan las manzanas por kilo?",
    "options": ["Un euro", "Deux euros", "Trois euros", "Cinq euros"],
    "correct_answer": "Deux euros",
    "explanation_es": "El vendedor anuncia: \"Deux euros le kilo !\" Las manzanas cuestan dos euros por kilo."
  }',
  1, 1
),
(
  'a1000001-1e34-0003-0002-000000000002',
  'a1000001-1157-0003-0001-000000000003',
  'multiple_choice',
  'Cuanto de tomates pide la clienta?',
  '{
    "question_fr": "Combien de tomates commande la cliente ?",
    "question_es": "Cuanto de tomates pide la clienta?",
    "options": ["Un kilo", "Un demi-kilo", "Deux kilos", "Trois kilos"],
    "correct_answer": "Un demi-kilo",
    "explanation_es": "La clienta dice: \"Un demi-kilo de tomates, s''il vous plait.\" Pide medio kilo de tomates."
  }',
  1, 2
),
(
  'a1000001-1e34-0003-0003-000000000003',
  'a1000001-1157-0003-0001-000000000003',
  'multiple_choice',
  'Cuanto es el total de la compra?',
  '{
    "question_fr": "Quel est le prix total ?",
    "question_es": "Cuanto es el total de la compra?",
    "options": ["2,00 euros", "3,00 euros", "3,50 euros", "5,00 euros"],
    "correct_answer": "3,50 euros",
    "explanation_es": "El vendedor dice: \"Ca fait trois euros cinquante au total.\" Un kilo de manzanas (2 EUR) + medio kilo de tomates (1,50 EUR) = 3,50 EUR."
  }',
  1, 3
),
(
  'a1000001-1e34-0003-0004-000000000004',
  'a1000001-1157-0003-0001-000000000003',
  'multiple_choice',
  'Cuanto cambio recibe la clienta?',
  '{
    "question_fr": "Combien de monnaie recoit la cliente ?",
    "question_es": "Cuanto cambio recibe la clienta?",
    "options": ["Cinquante centimes", "Un euro", "Un euro cinquante", "Deux euros"],
    "correct_answer": "Un euro cinquante",
    "explanation_es": "El vendedor dice: \"Voila votre monnaie, un euro cinquante.\" La clienta paga con cinco euros y recibe 1,50 EUR de cambio (5,00 - 3,50 = 1,50)."
  }',
  2, 4
);

-- ============================================================================
-- Exercise 4: Les presentations (Meeting new people)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-1157-0004-0001-000000000004',
  'listening',
  'A1',
  'Las presentaciones',
  'Les presentations',
  'Escucha como dos personas se presentan por primera vez y practica las expresiones basicas de presentacion.',
  '{
    "dialogue_text_fr": "Marie : Bonjour ! Je m''appelle Marie. Et vous, comment vous appelez-vous ?\nPierre : Bonjour, Marie ! Moi, c''est Pierre. Enchante !\nMarie : Enchantee ! Vous etes francais ?\nPierre : Oui, je suis de Lyon. Et vous ?\nMarie : Moi, je suis espagnole, de Madrid. J''habite a Paris depuis six mois.\nPierre : Ah, c''est bien ! Vous parlez tres bien francais. Qu''est-ce que vous faites a Paris ?\nMarie : Je suis etudiante. J''etudie l''art a la Sorbonne.\nPierre : C''est super ! Moi, je suis professeur de musique.\nMarie : Oh, c''est interessant ! Vous jouez de quel instrument ?\nPierre : Je joue du piano et de la guitare.",
    "dialogue_text_es": "Marie: Buenos dias! Me llamo Marie. Y usted, como se llama?\nPierre: Buenos dias, Marie! Yo soy Pierre. Encantado!\nMarie: Encantada! Usted es frances?\nPierre: Si, soy de Lyon. Y usted?\nMarie: Yo soy espanola, de Madrid. Vivo en Paris desde hace seis meses.\nPierre: Ah, que bien! Usted habla muy bien frances. Que hace en Paris?\nMarie: Soy estudiante. Estudio arte en la Sorbona.\nPierre: Que genial! Yo soy profesor de musica.\nMarie: Oh, que interesante! Que instrumento toca?\nPierre: Toco el piano y la guitarra.",
    "audio_url": "/audio/listening/a1/les-presentations.mp3",
    "duration_seconds": 48,
    "segments": [
      {"id": "s1", "start": 0.0, "end": 5.5, "text_fr": "Bonjour ! Je m''appelle Marie. Et vous, comment vous appelez-vous ?", "speaker": "marie"},
      {"id": "s2", "start": 5.5, "end": 9.5, "text_fr": "Bonjour, Marie ! Moi, c''est Pierre. Enchante !", "speaker": "pierre"},
      {"id": "s3", "start": 9.5, "end": 12.5, "text_fr": "Enchantee ! Vous etes francais ?", "speaker": "marie"},
      {"id": "s4", "start": 12.5, "end": 16.0, "text_fr": "Oui, je suis de Lyon. Et vous ?", "speaker": "pierre"},
      {"id": "s5", "start": 16.0, "end": 23.0, "text_fr": "Moi, je suis espagnole, de Madrid. J''habite a Paris depuis six mois.", "speaker": "marie"},
      {"id": "s6", "start": 23.0, "end": 30.0, "text_fr": "Ah, c''est bien ! Vous parlez tres bien francais. Qu''est-ce que vous faites a Paris ?", "speaker": "pierre"},
      {"id": "s7", "start": 30.0, "end": 35.0, "text_fr": "Je suis etudiante. J''etudie l''art a la Sorbonne.", "speaker": "marie"},
      {"id": "s8", "start": 35.0, "end": 39.0, "text_fr": "C''est super ! Moi, je suis professeur de musique.", "speaker": "pierre"},
      {"id": "s9", "start": 39.0, "end": 43.5, "text_fr": "Oh, c''est interessant ! Vous jouez de quel instrument ?", "speaker": "marie"},
      {"id": "s10", "start": 43.5, "end": 48.0, "text_fr": "Je joue du piano et de la guitare.", "speaker": "pierre"}
    ]
  }',
  4
);

-- Comprehension questions for Exercise 4
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-1e34-0004-0001-000000000001',
  'a1000001-1157-0004-0001-000000000004',
  'multiple_choice',
  'De donde es Marie?',
  '{
    "question_fr": "D''ou vient Marie ?",
    "question_es": "De donde es Marie?",
    "options": ["De Paris", "De Lyon", "De Madrid", "De Barcelona"],
    "correct_answer": "De Madrid",
    "explanation_es": "Marie dice: \"Je suis espagnole, de Madrid.\" Es espanola de Madrid que vive en Paris."
  }',
  1, 1
),
(
  'a1000001-1e34-0004-0002-000000000002',
  'a1000001-1157-0004-0001-000000000004',
  'multiple_choice',
  'Que estudia Marie?',
  '{
    "question_fr": "Qu''est-ce que Marie etudie ?",
    "question_es": "Que estudia Marie?",
    "options": ["La musique", "Les langues", "L''art", "La medecine"],
    "correct_answer": "L''art",
    "explanation_es": "Marie dice: \"J''etudie l''art a la Sorbonne.\" Estudia arte en la universidad de la Sorbona en Paris."
  }',
  1, 2
),
(
  'a1000001-1e34-0004-0003-000000000003',
  'a1000001-1157-0004-0001-000000000004',
  'multiple_choice',
  'Cual es la profesion de Pierre?',
  '{
    "question_fr": "Quelle est la profession de Pierre ?",
    "question_es": "Cual es la profesion de Pierre?",
    "options": ["Il est etudiant", "Il est professeur de musique", "Il est artiste", "Il est medecin"],
    "correct_answer": "Il est professeur de musique",
    "explanation_es": "Pierre dice: \"Moi, je suis professeur de musique.\" Es profesor de musica."
  }',
  1, 3
),
(
  'a1000001-1e34-0004-0004-000000000004',
  'a1000001-1157-0004-0001-000000000004',
  'multiple_choice',
  'Hace cuanto tiempo que Marie vive en Paris?',
  '{
    "question_fr": "Depuis combien de temps Marie habite-t-elle a Paris ?",
    "question_es": "Hace cuanto tiempo que Marie vive en Paris?",
    "options": ["Trois mois", "Six mois", "Un an", "Deux ans"],
    "correct_answer": "Six mois",
    "explanation_es": "Marie dice: \"J''habite a Paris depuis six mois.\" Vive en Paris desde hace seis meses."
  }',
  1, 4
);

-- ============================================================================
-- Exercise 5: A la boulangerie (Buying bread)
-- ============================================================================

INSERT INTO lessons (id, module, cefr_level, title_es, title_fr, description_es, content, order_index) VALUES
(
  'a1000001-1157-0005-0001-000000000005',
  'listening',
  'A1',
  'En la panaderia',
  'A la boulangerie',
  'Escucha una conversacion en una panaderia francesa y aprende vocabulario de pan y pasteleria.',
  '{
    "dialogue_text_fr": "Boulanger : Bonjour, monsieur ! Qu''est-ce que je vous sers ?\nClient : Bonjour ! Je voudrais une baguette tradition, s''il vous plait.\nBoulanger : Voila ! Elle est encore chaude, elle sort du four. Autre chose ?\nClient : Oui, vous avez des pains au chocolat ?\nBoulanger : Bien sur ! Il m''en reste trois. Combien en voulez-vous ?\nClient : Deux pains au chocolat, s''il vous plait. C''est pour mes enfants.\nBoulanger : Tres bien. Alors une baguette tradition et deux pains au chocolat.\nClient : Exactement. Ca fait combien ?\nBoulanger : La baguette, c''est un euro vingt, et les pains au chocolat, un euro trente chacun. Ca fait trois euros quatre-vingts.\nClient : Voici quatre euros. Gardez la monnaie !\nBoulanger : Oh, merci ! C''est gentil. Bonne journee, monsieur !\nClient : Bonne journee !",
    "dialogue_text_es": "Panadero: Buenos dias, senor! Que le sirvo?\nCliente: Buenos dias! Quisiera una baguette tradicion, por favor.\nPanadero: Aqui tiene! Todavia esta caliente, acaba de salir del horno. Algo mas?\nCliente: Si, tiene panes de chocolate?\nPanadero: Por supuesto! Me quedan tres. Cuantos quiere?\nCliente: Dos panes de chocolate, por favor. Son para mis hijos.\nPanadero: Muy bien. Entonces una baguette tradicion y dos panes de chocolate.\nCliente: Exactamente. Cuanto es?\nPanadero: La baguette cuesta un euro con veinte, y los panes de chocolate, un euro con treinta cada uno. Son tres euros con ochenta.\nCliente: Aqui tiene cuatro euros. Quedese con el cambio!\nPanadero: Oh, gracias! Que amable. Buen dia, senor!\nCliente: Buen dia!",
    "audio_url": "/audio/listening/a1/a-la-boulangerie.mp3",
    "duration_seconds": 52,
    "segments": [
      {"id": "s1", "start": 0.0, "end": 4.5, "text_fr": "Bonjour, monsieur ! Qu''est-ce que je vous sers ?", "speaker": "boulanger"},
      {"id": "s2", "start": 4.5, "end": 10.0, "text_fr": "Bonjour ! Je voudrais une baguette tradition, s''il vous plait.", "speaker": "client"},
      {"id": "s3", "start": 10.0, "end": 17.0, "text_fr": "Voila ! Elle est encore chaude, elle sort du four. Autre chose ?", "speaker": "boulanger"},
      {"id": "s4", "start": 17.0, "end": 21.5, "text_fr": "Oui, vous avez des pains au chocolat ?", "speaker": "client"},
      {"id": "s5", "start": 21.5, "end": 27.0, "text_fr": "Bien sur ! Il m''en reste trois. Combien en voulez-vous ?", "speaker": "boulanger"},
      {"id": "s6", "start": 27.0, "end": 33.0, "text_fr": "Deux pains au chocolat, s''il vous plait. C''est pour mes enfants.", "speaker": "client"},
      {"id": "s7", "start": 33.0, "end": 38.0, "text_fr": "Tres bien. Alors une baguette tradition et deux pains au chocolat.", "speaker": "boulanger"},
      {"id": "s8", "start": 38.0, "end": 40.5, "text_fr": "Exactement. Ca fait combien ?", "speaker": "client"},
      {"id": "s9", "start": 40.5, "end": 47.5, "text_fr": "La baguette, c''est un euro vingt, et les pains au chocolat, un euro trente chacun. Ca fait trois euros quatre-vingts.", "speaker": "boulanger"},
      {"id": "s10", "start": 47.5, "end": 52.0, "text_fr": "Voici quatre euros. Gardez la monnaie !", "speaker": "client"}
    ]
  }',
  5
);

-- Comprehension questions for Exercise 5
INSERT INTO lesson_exercises (id, lesson_id, exercise_type, prompt_es, content, difficulty_tier, order_index) VALUES
(
  'a1000001-1e34-0005-0001-000000000001',
  'a1000001-1157-0005-0001-000000000005',
  'multiple_choice',
  'Que tipo de baguette pide el cliente?',
  '{
    "question_fr": "Quel type de baguette commande le client ?",
    "question_es": "Que tipo de baguette pide el cliente?",
    "options": ["Une baguette classique", "Une baguette tradition", "Une baguette de campagne", "Une baguette complete"],
    "correct_answer": "Une baguette tradition",
    "explanation_es": "El cliente dice: \"Je voudrais une baguette tradition.\" La baguette tradition es un tipo de baguette artesanal hecha sin aditivos."
  }',
  1, 1
),
(
  'a1000001-1e34-0005-0002-000000000002',
  'a1000001-1157-0005-0001-000000000005',
  'multiple_choice',
  'Para quien son los panes de chocolate?',
  '{
    "question_fr": "Pour qui sont les pains au chocolat ?",
    "question_es": "Para quien son los panes de chocolate?",
    "options": ["Pour sa femme", "Pour ses amis", "Pour ses enfants", "Pour lui-meme"],
    "correct_answer": "Pour ses enfants",
    "explanation_es": "El cliente dice: \"C''est pour mes enfants.\" Los panes de chocolate son para sus hijos."
  }',
  1, 2
),
(
  'a1000001-1e34-0005-0003-000000000003',
  'a1000001-1157-0005-0001-000000000005',
  'multiple_choice',
  'Cuanto cuesta la baguette?',
  '{
    "question_fr": "Combien coute la baguette ?",
    "question_es": "Cuanto cuesta la baguette?",
    "options": ["Un euro", "Un euro vingt", "Un euro trente", "Un euro cinquante"],
    "correct_answer": "Un euro vingt",
    "explanation_es": "El panadero dice: \"La baguette, c''est un euro vingt.\" La baguette cuesta 1,20 EUR."
  }',
  1, 3
),
(
  'a1000001-1e34-0005-0004-000000000004',
  'a1000001-1157-0005-0001-000000000005',
  'multiple_choice',
  'Cuanto es el total?',
  '{
    "question_fr": "Quel est le prix total ?",
    "question_es": "Cuanto es el total?",
    "options": ["2,50 euros", "3,50 euros", "3,80 euros", "4,00 euros"],
    "correct_answer": "3,80 euros",
    "explanation_es": "El panadero dice: \"Ca fait trois euros quatre-vingts.\" La baguette (1,20 EUR) + dos panes de chocolate (2 x 1,30 EUR = 2,60 EUR) = 3,80 EUR."
  }',
  1, 4
);
