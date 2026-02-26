-- Seed data: Exam question bank for placement tests and CEFR exit exams
-- 36 questions spanning A1-B2 across vocabulary, grammar, and reading comprehension
--
-- Each row stores structured question data as JSONB with:
--   type, prompt_fr, prompt_es, options (for MC), correct_answer, skill, explanation

-- First, create the exam_questions table if it does not exist
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_level cefr_level_enum NOT NULL,
  skill VARCHAR(30) NOT NULL,
  question_type VARCHAR(30) NOT NULL,
  prompt_fr TEXT NOT NULL,
  prompt_es TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  question_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_questions_level ON exam_questions(cefr_level);
CREATE INDEX IF NOT EXISTS idx_exam_questions_skill ON exam_questions(skill);

-- ---------------------------------------------------------------------------
-- A1 Questions (9 questions)
-- ---------------------------------------------------------------------------

INSERT INTO exam_questions (cefr_level, skill, question_type, prompt_fr, prompt_es, options, correct_answer, question_data) VALUES

-- A1 Vocabulary
('A1', 'vocabulary', 'multiple_choice',
 'Comment dit-on "gato" en francais ?',
 'Como se dice "gato" en frances?',
 '["chat", "chien", "oiseau", "poisson"]',
 'chat',
 '{"type": "multiple_choice", "prompt_fr": "Comment dit-on \"gato\" en francais ?", "prompt_es": "Como se dice \"gato\" en frances?", "options": ["chat", "chien", "oiseau", "poisson"], "correct_answer": "chat", "skill": "vocabulary", "explanation": "Chat = gato. Chien = perro, oiseau = pajaro, poisson = pez."}'),

('A1', 'vocabulary', 'fill_blank',
 'Je mange une ___ rouge. (fruta)',
 'Como una ___ roja. (fruta)',
 '["pomme", "banane", "orange", "fraise"]',
 'pomme',
 '{"type": "fill_blank", "prompt_fr": "Je mange une ___ rouge. (fruta)", "prompt_es": "Como una ___ roja. (fruta)", "options": ["pomme", "banane", "orange", "fraise"], "correct_answer": "pomme", "skill": "vocabulary", "explanation": "Pomme = manzana. Es la unica fruta del listado que puede ser roja de forma natural."}'),

('A1', 'vocabulary', 'multiple_choice',
 'Quel jour vient apres lundi ?',
 'Que dia viene despues del lunes?',
 '["mardi", "mercredi", "dimanche", "vendredi"]',
 'mardi',
 '{"type": "multiple_choice", "prompt_fr": "Quel jour vient apres lundi ?", "prompt_es": "Que dia viene despues del lunes?", "options": ["mardi", "mercredi", "dimanche", "vendredi"], "correct_answer": "mardi", "skill": "vocabulary", "explanation": "Mardi (martes) viene despues de lundi (lunes)."}'),

-- A1 Grammar
('A1', 'grammar', 'fill_blank',
 'Je ___ francais. (hablar, presente)',
 'Yo ___ frances. (hablar, presente)',
 '["parle", "parles", "parlons", "parlent"]',
 'parle',
 '{"type": "fill_blank", "prompt_fr": "Je ___ francais. (hablar, presente)", "prompt_es": "Yo ___ frances. (hablar, presente)", "options": ["parle", "parles", "parlons", "parlent"], "correct_answer": "parle", "skill": "grammar", "explanation": "Con ''je'' (yo), el verbo ''parler'' se conjuga como ''parle''."}'),

('A1', 'grammar', 'multiple_choice',
 'Quelle est la forme correcte ? "Elle ___ contente."',
 'Cual es la forma correcta? "Ella ___ contenta."',
 '["est", "es", "et", "ai"]',
 'est',
 '{"type": "multiple_choice", "prompt_fr": "Quelle est la forme correcte ? \"Elle ___ contente.\"", "prompt_es": "Cual es la forma correcta? \"Ella ___ contenta.\"", "options": ["est", "es", "et", "ai"], "correct_answer": "est", "skill": "grammar", "explanation": "''Est'' es la conjugacion de ''etre'' (ser/estar) con ''elle'' (ella)."}'),

('A1', 'grammar', 'fill_blank',
 'Nous ___ a la maison. (estar, presente)',
 'Nosotros ___ en casa. (estar, presente)',
 '["sommes", "sont", "etes", "suis"]',
 'sommes',
 '{"type": "fill_blank", "prompt_fr": "Nous ___ a la maison. (estar, presente)", "prompt_es": "Nosotros ___ en casa. (estar, presente)", "options": ["sommes", "sont", "etes", "suis"], "correct_answer": "sommes", "skill": "grammar", "explanation": "Con ''nous'' (nosotros), ''etre'' se conjuga como ''sommes''."}'),

-- A1 Reading comprehension
('A1', 'reading', 'multiple_choice',
 'Lisez: "Marie a un chat noir. Il s''appelle Felix. Felix aime le lait." Quel est le nom du chat ?',
 'Lea: "Marie tiene un gato negro. Se llama Felix. A Felix le gusta la leche." Como se llama el gato?',
 '["Felix", "Marie", "Noir", "Lait"]',
 'Felix',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Marie a un chat noir. Il s''appelle Felix. Felix aime le lait.\" Quel est le nom du chat ?", "prompt_es": "Lea: \"Marie tiene un gato negro. Se llama Felix. A Felix le gusta la leche.\" Como se llama el gato?", "options": ["Felix", "Marie", "Noir", "Lait"], "correct_answer": "Felix", "skill": "reading", "explanation": "El texto dice ''Il s''appelle Felix'' (Se llama Felix)."}'),

('A1', 'reading', 'multiple_choice',
 'Lisez: "Bonjour, je m''appelle Pierre. J''ai 10 ans. J''habite a Paris." Ou habite Pierre ?',
 'Lea: "Hola, me llamo Pierre. Tengo 10 anos. Vivo en Paris." Donde vive Pierre?',
 '["Paris", "Lyon", "Marseille", "Bordeaux"]',
 'Paris',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Bonjour, je m''appelle Pierre. J''ai 10 ans. J''habite a Paris.\" Ou habite Pierre ?", "prompt_es": "Lea: \"Hola, me llamo Pierre. Tengo 10 anos. Vivo en Paris.\" Donde vive Pierre?", "options": ["Paris", "Lyon", "Marseille", "Bordeaux"], "correct_answer": "Paris", "skill": "reading", "explanation": "El texto dice ''J''habite a Paris'' (Vivo en Paris)."}'),

('A1', 'reading', 'multiple_choice',
 'Lisez: "Le matin, je bois du cafe et je mange du pain." Que fait cette personne le matin ?',
 'Lea: "Por la manana, bebo cafe y como pan." Que hace esta persona por la manana?',
 '["Elle prend le petit-dejeuner", "Elle fait du sport", "Elle dort", "Elle travaille"]',
 'Elle prend le petit-dejeuner',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Le matin, je bois du cafe et je mange du pain.\" Que fait cette personne le matin ?", "prompt_es": "Lea: \"Por la manana, bebo cafe y como pan.\" Que hace esta persona por la manana?", "options": ["Elle prend le petit-dejeuner", "Elle fait du sport", "Elle dort", "Elle travaille"], "correct_answer": "Elle prend le petit-dejeuner", "skill": "reading", "explanation": "Beber cafe y comer pan es tomar el desayuno (prendre le petit-dejeuner)."}'),

-- ---------------------------------------------------------------------------
-- A2 Questions (9 questions)
-- ---------------------------------------------------------------------------

-- A2 Vocabulary
('A2', 'vocabulary', 'fill_blank',
 'Pour aller au travail, je prends le ___. (transporte publico)',
 'Para ir al trabajo, tomo el ___. (transporte publico)',
 '["metro", "velo", "avion", "bateau"]',
 'metro',
 '{"type": "fill_blank", "prompt_fr": "Pour aller au travail, je prends le ___. (transporte publico)", "prompt_es": "Para ir al trabajo, tomo el ___. (transporte publico)", "options": ["metro", "velo", "avion", "bateau"], "correct_answer": "metro", "skill": "vocabulary", "explanation": "Metro es el transporte publico mas comun para ir al trabajo. Velo = bicicleta, avion y bateau no son transporte cotidiano."}'),

('A2', 'vocabulary', 'multiple_choice',
 'Quel mot signifie "libreria" en francais ?',
 'Que palabra significa "libreria" en frances?',
 '["librairie", "bibliotheque", "livre", "lecture"]',
 'librairie',
 '{"type": "multiple_choice", "prompt_fr": "Quel mot signifie \"libreria\" en francais ?", "prompt_es": "Que palabra significa \"libreria\" en frances?", "options": ["librairie", "bibliotheque", "livre", "lecture"], "correct_answer": "librairie", "skill": "vocabulary", "explanation": "Librairie = libreria (tienda). Bibliotheque = biblioteca. Cuidado con este falso amigo."}'),

('A2', 'vocabulary', 'multiple_choice',
 'Choisissez le synonyme de "content" :',
 'Elija el sinonimo de "contento":',
 '["heureux", "triste", "fatigue", "malade"]',
 'heureux',
 '{"type": "multiple_choice", "prompt_fr": "Choisissez le synonyme de \"content\" :", "prompt_es": "Elija el sinonimo de \"contento\":", "options": ["heureux", "triste", "fatigue", "malade"], "correct_answer": "heureux", "skill": "vocabulary", "explanation": "Heureux = feliz/contento. Triste = triste, fatigue = cansado, malade = enfermo."}'),

-- A2 Grammar
('A2', 'grammar', 'fill_blank',
 'Hier, j''___ au cinema avec mes amis. (ir, pasado)',
 'Ayer, yo ___ al cine con mis amigos. (ir, pasado)',
 '["suis alle", "vais aller", "allais", "irai"]',
 'suis alle',
 '{"type": "fill_blank", "prompt_fr": "Hier, j''___ au cinema avec mes amis. (ir, pasado)", "prompt_es": "Ayer, yo ___ al cine con mis amigos. (ir, pasado)", "options": ["suis alle", "vais aller", "allais", "irai"], "correct_answer": "suis alle", "skill": "grammar", "explanation": "''Suis alle'' es el passe compose de ''aller'' con ''je''. Se usa el auxiliar etre."}'),

('A2', 'grammar', 'multiple_choice',
 'Completez : "Les enfants ___ dans le jardin."',
 'Complete: "Los ninos ___ en el jardin."',
 '["jouent", "joue", "jouons", "jouez"]',
 'jouent',
 '{"type": "multiple_choice", "prompt_fr": "Completez : \"Les enfants ___ dans le jardin.\"", "prompt_es": "Complete: \"Los ninos ___ en el jardin.\"", "options": ["jouent", "joue", "jouons", "jouez"], "correct_answer": "jouent", "skill": "grammar", "explanation": "''Les enfants'' es tercera persona del plural, asi que ''jouer'' se conjuga como ''jouent''."}'),

('A2', 'grammar', 'fill_blank',
 'Elle a ___ une belle robe. (comprar, participio)',
 'Ella ha ___ un vestido bonito. (comprar, participio)',
 '["achete", "achetee", "acheter", "achetant"]',
 'achete',
 '{"type": "fill_blank", "prompt_fr": "Elle a ___ une belle robe. (comprar, participio)", "prompt_es": "Ella ha ___ un vestido bonito. (comprar, participio)", "options": ["achete", "achetee", "acheter", "achetant"], "correct_answer": "achete", "skill": "grammar", "explanation": "Con el auxiliar ''avoir'', el participio no concuerda con el sujeto: ''achete'' (sin acuerdo)."}'),

-- A2 Reading comprehension
('A2', 'reading', 'multiple_choice',
 'Lisez: "Sophie travaille dans un hopital. Elle soigne les malades. Elle porte un uniforme blanc." Quel est le metier de Sophie ?',
 'Lea: "Sophie trabaja en un hospital. Ella cuida a los enfermos. Lleva un uniforme blanco." Cual es la profesion de Sophie?',
 '["Infirmiere", "Professeur", "Avocate", "Cuisiniere"]',
 'Infirmiere',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Sophie travaille dans un hopital. Elle soigne les malades. Elle porte un uniforme blanc.\" Quel est le metier de Sophie ?", "prompt_es": "Lea: \"Sophie trabaja en un hospital. Ella cuida a los enfermos. Lleva un uniforme blanco.\" Cual es la profesion de Sophie?", "options": ["Infirmiere", "Professeur", "Avocate", "Cuisiniere"], "correct_answer": "Infirmiere", "skill": "reading", "explanation": "Trabaja en un hospital y cuida enfermos: es enfermera (infirmiere)."}'),

('A2', 'reading', 'multiple_choice',
 'Lisez: "Il fait beau aujourd''hui. Le soleil brille et il fait 25 degres. C''est parfait pour aller a la plage." Quel temps fait-il ?',
 'Lea: "Hace buen tiempo hoy. El sol brilla y hace 25 grados. Es perfecto para ir a la playa." Que tiempo hace?',
 '["Il fait beau et chaud", "Il pleut", "Il neige", "Il fait froid"]',
 'Il fait beau et chaud',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Il fait beau aujourd''hui. Le soleil brille et il fait 25 degres. C''est parfait pour aller a la plage.\" Quel temps fait-il ?", "prompt_es": "Lea: \"Hace buen tiempo hoy. El sol brilla y hace 25 grados. Es perfecto para ir a la playa.\" Que tiempo hace?", "options": ["Il fait beau et chaud", "Il pleut", "Il neige", "Il fait froid"], "correct_answer": "Il fait beau et chaud", "skill": "reading", "explanation": "El texto describe sol brillante y 25 grados: hace buen tiempo y calor."}'),

('A2', 'reading', 'multiple_choice',
 'Lisez: "Je me leve a 7 heures. Je prends une douche et je m''habille. Ensuite, je prends le petit-dejeuner." A quelle heure se leve cette personne ?',
 'Lea: "Me levanto a las 7. Me ducho y me visto. Despues, desayuno." A que hora se levanta esta persona?',
 '["7 heures", "6 heures", "8 heures", "9 heures"]',
 '7 heures',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"Je me leve a 7 heures. Je prends une douche et je m''habille. Ensuite, je prends le petit-dejeuner.\" A quelle heure se leve cette personne ?", "prompt_es": "Lea: \"Me levanto a las 7. Me ducho y me visto. Despues, desayuno.\" A que hora se levanta esta persona?", "options": ["7 heures", "6 heures", "8 heures", "9 heures"], "correct_answer": "7 heures", "skill": "reading", "explanation": "El texto dice claramente ''Je me leve a 7 heures'' (Me levanto a las 7)."}'),

-- ---------------------------------------------------------------------------
-- B1 Questions (9 questions)
-- ---------------------------------------------------------------------------

-- B1 Vocabulary
('B1', 'vocabulary', 'multiple_choice',
 'Quel est le sens de l''expression "avoir le cafard" ?',
 'Cual es el significado de la expresion "avoir le cafard"?',
 '["Etre triste / deprime", "Avoir faim", "Etre en colere", "Avoir peur"]',
 'Etre triste / deprime',
 '{"type": "multiple_choice", "prompt_fr": "Quel est le sens de l''expression \"avoir le cafard\" ?", "prompt_es": "Cual es el significado de la expresion \"avoir le cafard\"?", "options": ["Etre triste / deprime", "Avoir faim", "Etre en colere", "Avoir peur"], "correct_answer": "Etre triste / deprime", "skill": "vocabulary", "explanation": "''Avoir le cafard'' es una expresion idiomatica que significa estar triste o deprimido."}'),

('B1', 'vocabulary', 'fill_blank',
 'Le medecin m''a donne une ___ pour mes medicaments.',
 'El medico me dio una ___ para mis medicamentos.',
 '["ordonnance", "commande", "facture", "recette"]',
 'ordonnance',
 '{"type": "fill_blank", "prompt_fr": "Le medecin m''a donne une ___ pour mes medicaments.", "prompt_es": "El medico me dio una ___ para mis medicamentos.", "options": ["ordonnance", "commande", "facture", "recette"], "correct_answer": "ordonnance", "skill": "vocabulary", "explanation": "Ordonnance = receta medica. Commande = pedido, facture = factura, recette = receta de cocina."}'),

('B1', 'vocabulary', 'multiple_choice',
 'Choisissez le mot correct : "Il faut ___ ce probleme rapidement."',
 'Elija la palabra correcta: "Hay que ___ este problema rapidamente."',
 '["resoudre", "dissoudre", "absoudre", "resumer"]',
 'resoudre',
 '{"type": "multiple_choice", "prompt_fr": "Choisissez le mot correct : \"Il faut ___ ce probleme rapidement.\"", "prompt_es": "Elija la palabra correcta: \"Hay que ___ este problema rapidamente.\"", "options": ["resoudre", "dissoudre", "absoudre", "resumer"], "correct_answer": "resoudre", "skill": "vocabulary", "explanation": "Resoudre = resolver. Dissoudre = disolver, absoudre = absolver, resumer = resumir."}'),

-- B1 Grammar
('B1', 'grammar', 'fill_blank',
 'Si j''___ plus d''argent, je voyagerais. (tener, imperfecto)',
 'Si yo ___ mas dinero, viajaria. (tener, imperfecto)',
 '["avais", "aurais", "ai", "aurai"]',
 'avais',
 '{"type": "fill_blank", "prompt_fr": "Si j''___ plus d''argent, je voyagerais. (tener, imperfecto)", "prompt_es": "Si yo ___ mas dinero, viajaria. (tener, imperfecto)", "options": ["avais", "aurais", "ai", "aurai"], "correct_answer": "avais", "skill": "grammar", "explanation": "Condicional presente: Si + imparfait, conditionnel. ''Si j''avais... je voyagerais.''"}'),

('B1', 'grammar', 'multiple_choice',
 'Quelle phrase utilise correctement le subjonctif ?',
 'Que frase usa correctamente el subjuntivo?',
 '["Il faut que tu fasses tes devoirs", "Il faut que tu fais tes devoirs", "Il faut que tu ferais tes devoirs", "Il faut que tu as fait tes devoirs"]',
 'Il faut que tu fasses tes devoirs',
 '{"type": "multiple_choice", "prompt_fr": "Quelle phrase utilise correctement le subjonctif ?", "prompt_es": "Que frase usa correctamente el subjuntivo?", "options": ["Il faut que tu fasses tes devoirs", "Il faut que tu fais tes devoirs", "Il faut que tu ferais tes devoirs", "Il faut que tu as fait tes devoirs"], "correct_answer": "Il faut que tu fasses tes devoirs", "skill": "grammar", "explanation": "''Il faut que'' exige el subjuntivo. ''Fasses'' es el subjuntivo de ''faire'' con ''tu''."}'),

('B1', 'grammar', 'fill_blank',
 'C''est le livre ___ je t''ai parle. (pronombre relativo)',
 'Es el libro ___ te hable. (pronombre relativo)',
 '["dont", "que", "qui", "ou"]',
 'dont',
 '{"type": "fill_blank", "prompt_fr": "C''est le livre ___ je t''ai parle. (pronombre relativo)", "prompt_es": "Es el libro ___ te hable. (pronombre relativo)", "options": ["dont", "que", "qui", "ou"], "correct_answer": "dont", "skill": "grammar", "explanation": "''Dont'' reemplaza un complemento con ''de''. ''Parler de quelque chose'' -> ''dont je t''ai parle''."}'),

-- B1 Reading comprehension
('B1', 'reading', 'multiple_choice',
 'Lisez: "De plus en plus de Francais choisissent le teletravail. Cette tendance, acceleree par la pandemie, permet de reduire le temps de transport et d''ameliorer l''equilibre vie professionnelle-vie personnelle." Quel est l''avantage principal du teletravail mentionne ?',
 'Lea: "Cada vez mas franceses eligen el teletrabajo. Esta tendencia, acelerada por la pandemia, permite reducir el tiempo de transporte y mejorar el equilibrio vida profesional-vida personal." Cual es la ventaja principal del teletrabajo mencionada?',
 '["Reduire le transport et ameliorer l''equilibre de vie", "Gagner plus d''argent", "Travailler moins d''heures", "Avoir plus de vacances"]',
 'Reduire le transport et ameliorer l''equilibre de vie',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"De plus en plus de Francais choisissent le teletravail. Cette tendance, acceleree par la pandemie, permet de reduire le temps de transport et d''ameliorer l''equilibre vie professionnelle-vie personnelle.\" Quel est l''avantage principal du teletravail mentionne ?", "prompt_es": "Lea: \"Cada vez mas franceses eligen el teletrabajo. Esta tendencia, acelerada por la pandemia, permite reducir el tiempo de transporte y mejorar el equilibrio vida profesional-vida personal.\" Cual es la ventaja principal del teletrabajo mencionada?", "options": ["Reduire le transport et ameliorer l''equilibre de vie", "Gagner plus d''argent", "Travailler moins d''heures", "Avoir plus de vacances"], "correct_answer": "Reduire le transport et ameliorer l''equilibre de vie", "skill": "reading", "explanation": "El texto menciona explicitamente reducir transporte y mejorar equilibrio vida profesional-personal."}'),

('B1', 'reading', 'multiple_choice',
 'Lisez: "La gastronomie francaise est inscrite au patrimoine culturel immateriel de l''UNESCO depuis 2010. Elle se distingue par la qualite des produits et le savoir-faire des chefs." Depuis quand la gastronomie est-elle reconnue par l''UNESCO ?',
 'Lea: "La gastronomia francesa esta inscrita en el patrimonio cultural inmaterial de la UNESCO desde 2010. Se distingue por la calidad de los productos y el saber hacer de los chefs." Desde cuando la gastronomia es reconocida por la UNESCO?',
 '["2010", "2000", "2015", "2005"]',
 '2010',
 '{"type": "multiple_choice", "prompt_fr": "Lisez: \"La gastronomie francaise est inscrite au patrimoine culturel immateriel de l''UNESCO depuis 2010.\" Depuis quand la gastronomie est-elle reconnue par l''UNESCO ?", "prompt_es": "Lea: \"La gastronomia francesa esta inscrita en el patrimonio cultural inmaterial de la UNESCO desde 2010.\" Desde cuando es reconocida por la UNESCO?", "options": ["2010", "2000", "2015", "2005"], "correct_answer": "2010", "skill": "reading", "explanation": "El texto dice explicitamente ''depuis 2010'' (desde 2010)."}'),

('B1', 'reading', 'multiple_choice',
 'Lisez: "Le recyclage est essentiel pour proteger l''environnement. En France, chaque habitant produit environ 500 kg de dechets par an. Le tri selectif permet de recycler une grande partie de ces dechets." Combien de dechets produit un Francais par an ?',
 'Lea: "El reciclaje es esencial para proteger el medio ambiente. En Francia, cada habitante produce unos 500 kg de residuos al ano. La clasificacion selectiva permite reciclar gran parte de estos residuos." Cuantos residuos produce un frances al ano?',
 '["500 kg", "200 kg", "1000 kg", "300 kg"]',
 '500 kg',
 '{"type": "multiple_choice", "prompt_fr": "Combien de dechets produit un Francais par an ?", "prompt_es": "Cuantos residuos produce un frances al ano?", "options": ["500 kg", "200 kg", "1000 kg", "300 kg"], "correct_answer": "500 kg", "skill": "reading", "explanation": "El texto indica ''environ 500 kg de dechets par an'' (unos 500 kg de residuos al ano)."}'),

-- ---------------------------------------------------------------------------
-- B2 Questions (9 questions)
-- ---------------------------------------------------------------------------

-- B2 Vocabulary
('B2', 'vocabulary', 'multiple_choice',
 'Quel est le sens de "une aubaine" ?',
 'Cual es el significado de "une aubaine"?',
 '["Une bonne occasion / chance inattendue", "Un probleme grave", "Une obligation legale", "Un outil de cuisine"]',
 'Une bonne occasion / chance inattendue',
 '{"type": "multiple_choice", "prompt_fr": "Quel est le sens de \"une aubaine\" ?", "prompt_es": "Cual es el significado de \"une aubaine\"?", "options": ["Une bonne occasion / chance inattendue", "Un probleme grave", "Une obligation legale", "Un outil de cuisine"], "correct_answer": "Une bonne occasion / chance inattendue", "skill": "vocabulary", "explanation": "Aubaine = buena oportunidad inesperada, golpe de suerte."}'),

('B2', 'vocabulary', 'fill_blank',
 'Le gouvernement a pris des mesures pour ___ la pollution. (combatir)',
 'El gobierno tomo medidas para ___ la contaminacion. (combatir)',
 '["endiguer", "encourager", "engendrer", "envisager"]',
 'endiguer',
 '{"type": "fill_blank", "prompt_fr": "Le gouvernement a pris des mesures pour ___ la pollution. (combatir)", "prompt_es": "El gobierno tomo medidas para ___ la contaminacion. (combatir)", "options": ["endiguer", "encourager", "engendrer", "envisager"], "correct_answer": "endiguer", "skill": "vocabulary", "explanation": "Endiguer = contener/frenar. Encourager = animar, engendrer = generar, envisager = considerar."}'),

('B2', 'vocabulary', 'multiple_choice',
 'Que signifie "etre a bout de souffle" ?',
 'Que significa "etre a bout de souffle"?',
 '["Etre epuise / sans energie", "Etre en colere", "Etre surpris", "Etre amoureux"]',
 'Etre epuise / sans energie',
 '{"type": "multiple_choice", "prompt_fr": "Que signifie \"etre a bout de souffle\" ?", "prompt_es": "Que significa \"etre a bout de souffle\"?", "options": ["Etre epuise / sans energie", "Etre en colere", "Etre surpris", "Etre amoureux"], "correct_answer": "Etre epuise / sans energie", "skill": "vocabulary", "explanation": "''Etre a bout de souffle'' = estar agotado, sin aliento. Literalmente: estar al final del respiro."}'),

-- B2 Grammar
('B2', 'grammar', 'fill_blank',
 'Bien qu''il ___ malade, il est venu travailler. (estar, subjuntivo)',
 'Aunque ___ enfermo, vino a trabajar. (estar, subjuntivo)',
 '["soit", "est", "etait", "serait"]',
 'soit',
 '{"type": "fill_blank", "prompt_fr": "Bien qu''il ___ malade, il est venu travailler. (estar, subjuntivo)", "prompt_es": "Aunque ___ enfermo, vino a trabajar. (estar, subjuntivo)", "options": ["soit", "est", "etait", "serait"], "correct_answer": "soit", "skill": "grammar", "explanation": "''Bien que'' exige el subjuntivo en frances. ''Soit'' es el subjuntivo de ''etre''."}'),

('B2', 'grammar', 'multiple_choice',
 'Identifiez la phrase au plus-que-parfait :',
 'Identifique la frase en pluscuamperfecto:',
 '["J''avais deja mange quand il est arrive", "Je mangeais quand il est arrive", "J''ai mange avant qu''il arrive", "Je mangerai avant qu''il arrive"]',
 'J''avais deja mange quand il est arrive',
 '{"type": "multiple_choice", "prompt_fr": "Identifiez la phrase au plus-que-parfait :", "prompt_es": "Identifique la frase en pluscuamperfecto:", "options": ["J''avais deja mange quand il est arrive", "Je mangeais quand il est arrive", "J''ai mange avant qu''il arrive", "Je mangerai avant qu''il arrive"], "correct_answer": "J''avais deja mange quand il est arrive", "skill": "grammar", "explanation": "El plus-que-parfait se forma con el imperfecto del auxiliar + participio: ''avais mange''."}'),

('B2', 'grammar', 'fill_blank',
 'S''il avait etudie, il ___ l''examen. (aprobar, condicional pasado)',
 'Si hubiera estudiado, ___ el examen. (aprobar, condicional pasado)',
 '["aurait reussi", "a reussi", "reussirait", "avait reussi"]',
 'aurait reussi',
 '{"type": "fill_blank", "prompt_fr": "S''il avait etudie, il ___ l''examen. (aprobar, condicional pasado)", "prompt_es": "Si hubiera estudiado, ___ el examen. (aprobar, condicional pasado)", "options": ["aurait reussi", "a reussi", "reussirait", "avait reussi"], "correct_answer": "aurait reussi", "skill": "grammar", "explanation": "Condicion irreal pasada: Si + plus-que-parfait, conditionnel passe. ''Aurait reussi'' = habria aprobado."}'),

-- B2 Reading comprehension
('B2', 'reading', 'multiple_choice',
 'Lisez: "L''intelligence artificielle souleve des questions ethiques majeures. Si elle permet des avancees considerables en medecine et en science, elle pose neanmoins des risques en matiere de vie privee et d''emploi. Les legislateurs peinent a encadrer ces technologies en pleine evolution." Quel est le ton de ce texte ?',
 'Lea: "La inteligencia artificial plantea cuestiones eticas importantes. Si bien permite avances considerables en medicina y ciencia, plantea sin embargo riesgos en materia de privacidad y empleo. Los legisladores luchan por regular estas tecnologias en plena evolucion." Cual es el tono de este texto?',
 '["Nuance et critique", "Enthousiaste et optimiste", "Humoristique", "Indifferent"]',
 'Nuance et critique',
 '{"type": "multiple_choice", "prompt_fr": "Quel est le ton de ce texte sur l''IA ?", "prompt_es": "Cual es el tono de este texto sobre la IA?", "options": ["Nuance et critique", "Enthousiaste et optimiste", "Humoristique", "Indifferent"], "correct_answer": "Nuance et critique", "skill": "reading", "explanation": "El texto presenta ventajas y riesgos de forma equilibrada, con un tono matizado y critico."}'),

('B2', 'reading', 'multiple_choice',
 'Lisez: "La democratisation de l''enseignement superieur en France a conduit a une augmentation significative du nombre d''etudiants. Cependant, les universites font face a des defis budgetaires croissants et a une surcharge des amphitheatres." Quel probleme est souleve ?',
 'Lea: "La democratizacion de la educacion superior en Francia ha llevado a un aumento significativo del numero de estudiantes. Sin embargo, las universidades enfrentan desafios presupuestarios crecientes y sobrecarga de auditorios." Que problema se plantea?',
 '["Budget insuffisant et surcharge des universites", "Manque d''etudiants", "Trop de professeurs", "Fermeture des universites"]',
 'Budget insuffisant et surcharge des universites',
 '{"type": "multiple_choice", "prompt_fr": "Quel probleme est souleve ?", "prompt_es": "Que problema se plantea?", "options": ["Budget insuffisant et surcharge des universites", "Manque d''etudiants", "Trop de professeurs", "Fermeture des universites"], "correct_answer": "Budget insuffisant et surcharge des universites", "skill": "reading", "explanation": "El texto senala ''defis budgetaires croissants'' y ''surcharge des amphitheatres''."}'),

('B2', 'reading', 'multiple_choice',
 'Lisez: "Le mouvement impressionniste, ne en France au XIXe siecle, a revolutionne l''art en privilegiant la lumiere et l''instantaneite plutot que la precision academique. Monet, Renoir et Degas en furent les figures emblematiques." Qu''est-ce qui caracterise l''impressionnisme selon ce texte ?',
 'Lea: "El movimiento impresionista, nacido en Francia en el siglo XIX, revoluciono el arte privilegiando la luz y la instantaneidad sobre la precision academica. Monet, Renoir y Degas fueron sus figuras emblematicas." Que caracteriza al impresionismo segun este texto?',
 '["La lumiere et l''instantaneite", "La precision des details", "Les couleurs sombres", "Les sujets religieux"]',
 'La lumiere et l''instantaneite',
 '{"type": "multiple_choice", "prompt_fr": "Qu''est-ce qui caracterise l''impressionnisme selon ce texte ?", "prompt_es": "Que caracteriza al impresionismo segun este texto?", "options": ["La lumiere et l''instantaneite", "La precision des details", "Les couleurs sombres", "Les sujets religieux"], "correct_answer": "La lumiere et l''instantaneite", "skill": "reading", "explanation": "El texto dice que el impresionismo privilegia ''la lumiere et l''instantaneite'' (la luz y la instantaneidad)."}');
